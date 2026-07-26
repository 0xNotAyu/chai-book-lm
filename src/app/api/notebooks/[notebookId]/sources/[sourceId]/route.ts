// src/app/api/notebooks/[notebookId]/sources/[sourceId]/route.ts
import { NextResponse } from "next/server";
import { sourceService } from "@/services/source.services";

type RouteParams = {
  params: Promise<{ notebookId: string; sourceId: string }>;
};

// PATCH: re-index a source — rebuilds its vector chunks from the originally
// extracted text (no re-upload needed). Used when a source is stuck/failed,
// or just to refresh embeddings after a chunking/model change.
export async function PATCH(_req: Request, { params }: RouteParams) {
  try {
    const { sourceId } = await params;

    const reindexed = await sourceService.reindexSource(sourceId);

    if (!reindexed) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(reindexed);
  } catch (error) {
    console.error("Error re-indexing source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { sourceId } = await params;

    const deletedSource = await sourceService.deleteSource(sourceId);

    if (!deletedSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // sourceService.deleteSource already cleans up Qdrant vectors and any
    // Cloudinary asset before removing the Mongo document.
    return NextResponse.json({ message: "Source deleted successfully" });
  } catch (error) {
    console.error("Error deleting source:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
