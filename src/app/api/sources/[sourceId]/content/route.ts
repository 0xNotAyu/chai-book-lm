import { NextResponse } from "next/server";
import { sourceService } from "@/services/source.services";

type RouteParams = { params: Promise<{ sourceId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    const source = await sourceService.getExtractedTextById(sourceId);
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
    return NextResponse.json({ sourceType: source.sourceType, extractedText: source.extractedText || "" });
  } catch (error) {
    console.error("Error fetching source content:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}