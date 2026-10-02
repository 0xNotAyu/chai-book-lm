import { NextResponse } from "next/server";

import { qdrant } from "@/lib/qdrant";
import prisma from "@/lib/db";

export async function GET() {
  try {
    // Postgres (Neon)
    await prisma.$queryRaw`SELECT 1`;

    // Qdrant
    await qdrant.getCollections();
    console.log("✅ Qdrant connected.");

    return NextResponse.json({
      status: "healthy",
      services: {
        postgres: "connected",
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