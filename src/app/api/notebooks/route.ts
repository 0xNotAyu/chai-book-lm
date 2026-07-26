import { NextRequest, NextResponse } from "next/server";

import { notebookService } from "@/services/notebook.service";
import { createNotebookSchema } from "@/validators/notebook.schema";
import { getUserId } from "@/lib/getUserId";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const data = createNotebookSchema.parse(body);
    const notebook = await notebookService.createNotebook({ ...data, userId });
    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to create notebook" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json([]);
    const notebooks = await notebookService.getAllNotebooks(userId);
    return NextResponse.json(notebooks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to fetch notebooks" }, { status: 500 });
  }
}