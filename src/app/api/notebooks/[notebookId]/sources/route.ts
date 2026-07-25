// src/app/api/notebooks/[notebookId]/sources/route.ts
import { NextResponse } from "next/server";
import { sourceService } from "@/services/source.services";
import { createSourceSchema } from "@/validators/source.schema";
import { z } from "zod";

type RouteParams = { params: Promise<{ notebookId: string }> };

const EXTENSION_TO_SOURCE_TYPE: Record<string, "pdf" | "text" | "vtt"> = {
  pdf: "pdf",
  txt: "text",
  vtt: "vtt",
};

function truncateTitle(input: string, max = 100) {
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { notebookId } = await params;
    const sources = await sourceService.getSourcesByNotebookId(notebookId);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { notebookId } = await params;
    const contentType = req.headers.get("content-type") || "";

    // ---- 1. File upload: PDF / TXT / VTT ----
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const sourceType = EXTENSION_TO_SOURCE_TYPE[extension];

      if (!sourceType) {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload a .pdf, .txt, or .vtt file." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const validatedData = createSourceSchema.parse({
        notebookId,
        title: truncateTitle(file.name),
        fileName: file.name,
        sourceType,
      });

      const newSource = await sourceService.createSource(validatedData, fileBuffer);
      return NextResponse.json(newSource, { status: 201 });
    }

    // ---- 2. JSON: website URL / YouTube URL / pasted text ----
    if (contentType.includes("application/json")) {
      const json = await req.json();
      const { sourceType, url, textContent, title } = json as {
        sourceType: "website" | "youtube" | "text";
        url?: string;
        textContent?: string;
        title?: string;
      };

      let derivedTitle = title?.trim();

      if (!derivedTitle) {
        if (sourceType === "website" || sourceType === "youtube") {
          derivedTitle = url;
        } else if (sourceType === "text") {
          derivedTitle = textContent;
        }
      }

      if (!derivedTitle) {
        return NextResponse.json(
          { error: "Unable to determine a title for this source" },
          { status: 400 }
        );
      }

      const validatedData = createSourceSchema.parse({
        notebookId,
        title: truncateTitle(derivedTitle),
        sourceType,
        url,
        textContent,
      });

      const newSource = await sourceService.createSource(validatedData);
      return NextResponse.json(newSource, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
