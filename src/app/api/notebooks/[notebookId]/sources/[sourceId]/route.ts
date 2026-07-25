// src/app/api/notebooks/[notebookId]/sources/[sourceId]/route.ts
import { NextResponse } from "next/server";
import { sourceService } from "@/services/source.services";

export async function DELETE(
  req: Request,
  { params }: { params: { notebookId: string; sourceId: string } }
) {
  try {
    const deletedSource = await sourceService.deleteSource(params.sourceId);

    if (!deletedSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Note: Vector deletion logic from Qdrant will need to be added here

    return NextResponse.json({ message: "Source deleted successfully" });
  } catch (error) {
    console.error("Error deleting source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}