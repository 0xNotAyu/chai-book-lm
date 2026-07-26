import { NextRequest, NextResponse } from "next/server";
import { notebookService } from "@/services/notebook.service";
import { updateNotebookSchema } from "@/validators/notebook.schema";

interface RouteParams {
  params: Promise<{
    notebookId: string;
  }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { notebookId } = await params;

    const body = await req.json();
    const data = updateNotebookSchema.parse(body);

    const notebook = await notebookService.updateNotebook(notebookId, data);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    return NextResponse.json(notebook);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to update notebook" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { notebookId } = await params;

    const notebook = await notebookService.deleteNotebook(notebookId);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Notebook deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to delete notebook" }, { status: 500 });
  }
}