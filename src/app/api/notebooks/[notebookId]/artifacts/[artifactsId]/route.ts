import { NextResponse } from "next/server";
import { artifactService } from "@/services/artifact.service";

type RouteParams = { params: Promise<{ artifactId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { artifactId } = await params;
    const artifact = await artifactService.getById(artifactId);

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Error fetching artifact:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { artifactId } = await params;
    const deleted = await artifactService.delete(artifactId);

    if (!deleted) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Artifact deleted successfully" });
  } catch (error) {
    console.error("Error deleting artifact:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}