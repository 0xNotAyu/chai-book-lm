// src/app/api/notebooks/[notebookId]/sources/route.ts
import { NextResponse } from "next/server";
import { sourceService } from "@/services/source.services"; 
import { createSourceSchema } from "@/validators/source.schema";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: { notebookId: string } }
) {
  try {
    const sources = await sourceService.getSourcesByNotebookId(params.notebookId);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { notebookId: string } }
) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, any> = {};

    // 1. Handle incoming payload based on content type
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      data = {
        notebookId: params.notebookId,
        title: file.name,
        fileName: file.name,
        sourceType: "pdf",
      };
      
      // Note: File buffer extraction for Qdrant/Processing will happen here later
      
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      data = { ...json, notebookId: params.notebookId };
    } else {
      return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
    }

    // 2. Validate with Zod
    const validatedData = createSourceSchema.parse(data);

    // 3. Save to MongoDB
    const newSource = await sourceService.createSource(validatedData);

    return NextResponse.json(newSource, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error }, { status: 400 });
    }
    console.error("Error creating source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}