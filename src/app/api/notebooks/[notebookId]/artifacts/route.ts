import { NextResponse } from "next/server";
import { artifactService } from "@/services/artifact.service";
import { notebookService } from "@/services/notebook.service";
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

    const notebook = await notebookService.getNotebookById(notebookId);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    const artifact = await artifactService.generate(notebookId, notebook.title, type);

    if (artifact.status === "failed") {
      return NextResponse.json(
        { error: artifact.errorMessage || "Generation failed", artifact },
        { status: 422 }
      );
    }

    return NextResponse.json(artifact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }
    console.error("Error generating artifact:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}