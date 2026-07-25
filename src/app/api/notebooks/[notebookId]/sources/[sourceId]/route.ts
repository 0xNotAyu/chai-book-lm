// src/app/api/notebooks/[notebookId]/sources/[sourceId]/route.ts
import { NextResponse } from "next/server";
import { sourceService } from "@/services/source.services";

type RouteParams = {
  params: Promise<{ notebookId: string; sourceId: string }>;
};

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { sourceId } = await params;

    const deletedSource = await sourceService.deleteSource(sourceId);

    if (!deletedSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Note: Vector deletion logic from Qdrant will need to be added here
    // once the indexing pipeline (M4) is in place.

    return NextResponse.json({ message: "Source deleted successfully" });
  } catch (error) {
    console.error("Error deleting source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
