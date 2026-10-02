import  prisma  from "@/lib/db";
import type { SourceType, SourceStatus } from "@/generated/prisma/enums";
import { vectorService } from "./vector.service";
import { uploadPdfBuffer, deletePdfAsset } from "@/lib/cloudinary";

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
      status?: SourceStatus;
    },
    fileBuffer?: Buffer
  ) {
    // Pick columns explicitly. Prisma throws on unknown fields (textContent),
    // whereas Mongoose silently dropped them.
    const sourceDoc = await prisma.source.create({
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

    let result;
    try {
      let extractedText = "";
      let fileUrl: string | undefined;
      let cloudinaryPublicId: string | undefined;

      switch (data.sourceType) {
        case "pdf": {
          if (!fileBuffer) throw new Error("No file buffer provided for PDF.");
          extractedText = await extractPdf(fileBuffer);
          const uploaded = await uploadPdfBuffer(
            fileBuffer,
            data.fileName || `${sourceDoc.id}.pdf`
          );
          fileUrl = uploaded.url;
          cloudinaryPublicId = uploaded.publicId;
          break;
        }

        case "vtt":
          if (!fileBuffer) throw new Error("No file buffer provided for VTT.");
          extractedText = await extractVtt(fileBuffer);
          break;

        case "youtube":
          if (!data.url) throw new Error("No URL provided for YouTube.");
          extractedText = await extractYoutube(data.url);
          break;

        case "website":
          if (!data.url) throw new Error("No URL provided for Website.");
          extractedText = await extractWebsite(data.url);
          break;

        case "text":
          if (fileBuffer) {
            extractedText = await extractText(fileBuffer.toString("utf-8"));
          } else if (data.textContent) {
            extractedText = await extractText(data.textContent);
          } else {
            throw new Error("No text content provided.");
          }
          break;

        default:
          throw new Error(`Unsupported source type: ${data.sourceType}`);
      }

      if (!extractedText || !extractedText.trim()) {
        throw new Error("No content could be extracted from this source.");
      }

      const { chunkCount } = await vectorService.indexSource({
        sourceId: sourceDoc.id,
        notebookId: data.notebookId,
        sourceType: data.sourceType,
        title: data.title,
        url: data.url,
        fileUrl,
        rawText: extractedText,
      });

      result = await this.updateSource(sourceDoc.id, {
        status: "completed",
        fileUrl,
        chunkCount,
        cloudinaryPublicId,
        extractedText,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process source";
      console.error(`Processing failed for source ${sourceDoc.id}:`, message);

      result = await this.updateSource(sourceDoc.id, {
        status: "failed",
        errorMessage: message,
      });
    }

    return result;
  }

  async reindexSource(id: string) {
    // findUnique returns all scalar columns by default, including extractedText.
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) return null;

    await this.updateSource(id, { status: "processing", errorMessage: null });

    try {
      let extractedText = source.extractedText;

      if (!extractedText || !extractedText.trim()) {
        if (source.sourceType === "youtube" && source.url) {
          extractedText = await extractYoutube(source.url);
        } else if (source.sourceType === "website" && source.url) {
          extractedText = await extractWebsite(source.url);
        } else {
          throw new Error(
            "No stored content available to re-index this source. Please delete and re-upload it."
          );
        }
      }

      await vectorService.deleteSourceVectors(id);

      const { chunkCount } = await vectorService.indexSource({
        sourceId: id,
        notebookId: source.notebookId,
        sourceType: source.sourceType,
        title: source.title,
        url: source.url ?? undefined,
        fileUrl: source.fileUrl ?? undefined,
        rawText: extractedText,
      });

      return await this.updateSource(id, {
        status: "completed",
        chunkCount,
        errorMessage: null,
        extractedText,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to re-index source";
      console.error(`Re-index failed for source ${id}:`, message);
      return await this.updateSource(id, { status: "failed", errorMessage: message });
    }
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