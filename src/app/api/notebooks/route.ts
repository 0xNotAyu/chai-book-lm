import { NextRequest, NextResponse } from "next/server";

import { notebookService } from "@/services/notebook.service";
import { createNotebookSchema } from "@/validators/notebook.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createNotebookSchema.parse(body);

    const notebook = await notebookService.createNotebook(data);

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed to create notebook" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const notebooks = await notebookService.getAllNotebooks();

    return NextResponse.json(notebooks);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed to fetch notebooks" },
      { status: 500 }
    );
  }
}