// src/app/api/notebooks/[notebookId]/chat/route.ts
import { NextResponse } from "next/server";
import { streamChatAnswer } from "@/services/chat.service"
import connectMongoDB from "@/lib/mongodb";
import { Notebook } from "@/models/Notebook.model";

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
      try {
        for await (const event of streamChatAnswer({ notebookId, question })) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message }) + "\n"));
      } finally {
        controller.close();
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

  await connectMongoDB();
  const notebook = await Notebook.findById(notebookId).lean();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  return NextResponse.json(notebook.conversations ?? []);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { notebookId } = await params;
  await connectMongoDB();
  const notebook = await Notebook.findByIdAndUpdate(notebookId, { $set: { conversations: [] } }, { new: true });
  if (!notebook) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  return NextResponse.json({ message: "Chat cleared" });
}