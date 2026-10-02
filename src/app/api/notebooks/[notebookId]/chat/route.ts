// src/app/api/notebooks/[notebookId]/chat/route.ts
import { NextResponse } from "next/server";
import { streamChatAnswer } from "@/services/chat.service";
import prisma from "@/lib/db";

type RouteParams = { params: Promise<{ notebookId: string }> };

// POST: ask a question, stream back the grounded answer + citations.
// Response body is newline-delimited JSON (NDJSON), one event per line:
//   {"type":"token","content":"..."}
//   {"type":"citations","sources":[...]}
//   {"type":"error","message":"..."}
export async function POST(req: Request, { params }: RouteParams) {
  const { notebookId } = await params;
  const body = await req.json().catch(() => ({}));
  const question: string | undefined = body?.question;

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
  const send = (obj: unknown) =>
    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
  try {
    for await (const event of streamChatAnswer({ notebookId, question })) {
      send(event); // throws if the client is gone, which exits the loop and
    }              // triggers the generator's `finally` (partial save)
  } catch (err) {
    try {
      send({ type: "error", message: err instanceof Error ? err.message : "Stream failed" });
    } catch {}
  } finally {
    try { controller.close(); } catch {}
  }
},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

// GET: fetch existing conversation history for this notebook (page load / refresh).
export async function GET(_req: Request, { params }: RouteParams) {
  const { notebookId } = await params;

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    select: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          content: true,
          citations: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  return NextResponse.json(notebook.messages);
}

// DELETE: clear the chat history (keeps the notebook itself).
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { notebookId } = await params;

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    select: { id: true },
  });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  await prisma.message.deleteMany({ where: { notebookId } });
  return NextResponse.json({ message: "Chat cleared" });
}