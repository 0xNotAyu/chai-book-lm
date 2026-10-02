import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { artifactService } from "@/services/artifact.service";
import { createArtifactSchema } from "@/validators/artifact.schema";
import { z } from "zod";

type RouteParams = { params: Promise<{ notebookId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { notebookId } = await params;
    const artifacts = await artifactService.listByNotebook(notebookId);
    return NextResponse.json(artifacts);
  } catch (error) {
    console.error("Error fetching artifacts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { notebookId } = await params;
    const body = await req.json().catch(() => ({}));
    const { type } = createArtifactSchema.parse(body);

    // Only the title is needed. getNotebookById also loads every chat message.
    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
      select: { title: true },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    const artifact = await artifactService.generate(notebookId, notebook.title, type);

    // Queued, not finished. The client polls GET until status leaves "generating".
    return NextResponse.json(artifact, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }
    console.error("Error generating artifact:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}