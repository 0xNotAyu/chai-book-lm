import { NextResponse } from "next/server";


import { qdrant } from "@/lib/qdrant";
import connectMongoDB from "@/lib/mongodb";

export async function GET() {
  try {
    // MongoDB
    await connectMongoDB();

    // Qdrant
    await qdrant.getCollections();
    console.log('✅ Qdrant connected.')

    return NextResponse.json({
      status: "healthy",
      services: {
        mongodb: "connected",
        qdrant: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown Error",
      },
      { status: 500 }
    );
  }
}