import  prisma  from "@/lib/db";
import type { SourceType, SourceStatus } from "@/generated/prisma/enums";
import { vectorService } from "./vector.service";
import { uploadPdfBuffer, deletePdfAsset } from "@/lib/cloudinary";
import { inngest } from "@/inngest/client"

import {
  extractPdf,
  extractYoutube,
  extractWebsite,
  extractText,
  extractVtt,
} from "@/lib/extractors/index";

// Replaces Mongoose's `select: false`. Keeps list payloads small and keeps
// cloudinaryPublicId away from the client.
const LIGHT = { extractedText: true, cloudinaryPublicId: true } as const;

class SourceService {
async createSource(
  data: {
    notebookId: string;
    title: string;
    sourceType: SourceType;
    url?: string;
    fileName?: string;
    textContent?: string;
  },
  fileBuffer?: Buffer
) {
  const source = await prisma.source.create({
    data: {
      notebookId: data.notebookId,
      title: data.title,
      sourceType: data.sourceType,
      url: data.url,
      fileName: data.fileName,
      status: "processing",
    },
    omit: LIGHT,
  });

  try {
    let extractedText: string | undefined;
    let fileUrl: string | undefined;
    let cloudinaryPublicId: string | undefined;

    switch (data.sourceType) {
      case "pdf": {
        if (!fileBuffer) throw new Error("No file buffer provided for PDF.");
        extractedText = await extractPdf(fileBuffer);
        const uploaded = await uploadPdfBuffer(fileBuffer, data.fileName || `${source.id}.pdf`);
        fileUrl = uploaded.url;
        cloudinaryPublicId = uploaded.publicId;
        break;
      }
      case "vtt":
        if (!fileBuffer) throw new Error("No file buffer provided for VTT.");
        extractedText = await extractVtt(fileBuffer);
        break;
      case "text":
        if (fileBuffer) extractedText = await extractText(fileBuffer.toString("utf-8"));
        else if (data.textContent) extractedText = await extractText(data.textContent);
        else throw new Error("No text content provided.");
        break;
      case "youtube":
      case "website":
        if (!data.url) throw new Error(`No URL provided for ${data.sourceType}.`);
        break; // fetched inside the Inngest job
    }

    if (extractedText !== undefined && !extractedText.trim()) {
      throw new Error("No content could be extracted from this source.");
    }

    if (extractedText || fileUrl) {
      await this.updateSource(source.id, { extractedText, fileUrl, cloudinaryPublicId });
    }

    await inngest.send({ name: "source/process", data: { sourceId: source.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process source";
    console.error(`Source ${source.id} failed before queueing:`, message);
    return this.updateSource(source.id, { status: "failed", errorMessage: message });
  }

  return source; // status: "processing"; the job finishes it in the background
}

async reindexSource(id: string) {
  const exists = await prisma.source.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return null;

  const updated = await this.updateSource(id, { status: "processing", errorMessage: null });
  await inngest.send({ name: "source/process", data: { sourceId: id } });
  return updated;
}

  async getAllSources() {
    return prisma.source.findMany({ orderBy: { createdAt: "desc" }, omit: LIGHT });
  }

  async getSourceById(id: string) {
    return prisma.source.findUnique({ where: { id }, omit: LIGHT });
  }

  async getExtractedTextById(id: string) {
    return prisma.source.findUnique({
      where: { id },
      select: { id: true, sourceType: true, extractedText: true },
    });
  }

  async getSourcesByNotebookId(notebookId: string) {
    return prisma.source.findMany({
      where: { notebookId },
      orderBy: { createdAt: "desc" },
      omit: LIGHT,
    });
  }

  async updateSource(
    id: string,
    data: {
      title?: string;
      sourceType?: SourceType;
      url?: string;
      fileName?: string;
      fileUrl?: string;
      status?: SourceStatus;
      errorMessage?: string | null;
      chunkCount?: number;
      cloudinaryPublicId?: string;
      extractedText?: string;
    }
  ) {
    return prisma.source.update({ where: { id }, data, omit: LIGHT });
  }

  async deleteSource(id: string) {
    const source = await prisma.source.findUnique({
      where: { id },
      select: { cloudinaryPublicId: true },
    });
    if (!source) return null;

    await vectorService.deleteSourceVectors(id).catch((err) => {
      console.error(`Failed to delete vectors for source ${id}:`, err);
    });

    if (source.cloudinaryPublicId) {
      await deletePdfAsset(source.cloudinaryPublicId).catch((err) => {
        console.error(`Failed to delete Cloudinary asset for source ${id}:`, err);
      });
    }

    return prisma.source.delete({ where: { id }, omit: LIGHT });
  }
}

export const sourceService = new SourceService();