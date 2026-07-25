import connectMongoDB from "@/lib/mongodb";
import Source from "../models/Source.model";
import { vectorService } from "./vector.service";

import {
  extractPdf,
  extractYoutube,
  extractWebsite,
  extractText,
  extractVtt,
} from "@/lib/extractors/index";

class SourceService {
  async createSource(
    data: {
      notebookId: string;
      title: string;
      sourceType: "pdf" | "youtube" | "website" | "text" | "vtt";
      url?: string;
      fileName?: string;
      textContent?: string; // raw pasted text (paste-text dialog step)
      status?: "processing" | "completed" | "failed";
    },
    fileBuffer?: Buffer // binary data for pdf / vtt / uploaded .txt files
  ) {
    await connectMongoDB();

    // 1. Create the initial document in MongoDB with "processing" status
    const sourceDoc = await Source.create({
      ...data,
      status: "processing", // Override any input to force processing state
    });

    // 2. Payload Routing, Extraction, Chunking, Embedding & Indexing Phase
    // Note: In serverless Next.js, awaiting this blocks the API response until
    // everything finishes. For large files, you'd eventually move this to a
    // background job — fine for the scope of this project.
    try {
      let extractedText = "";

      switch (data.sourceType) {
        case "pdf":
          if (!fileBuffer) throw new Error("No file buffer provided for PDF.");
          extractedText = await extractPdf(fileBuffer);
          break;

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
          // Either a pasted text string, or an uploaded .txt file buffer.
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

      // Chunk -> embed -> store in Qdrant
      const { chunkCount } = await vectorService.indexSource({
        sourceId: sourceDoc._id.toString(),
        notebookId: data.notebookId,
        sourceType: data.sourceType,
        title: data.title,
        url: data.url,
        rawText: extractedText,
      });

      // 3. Mark as completed once extraction + indexing both succeed
      await this.updateSource(sourceDoc._id.toString(), {
        status: "completed",
        chunkCount,
      });

      // Update local object to reflect the DB change before returning
      sourceDoc.status = "completed";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process source";
      console.error(`Processing failed for source ${sourceDoc._id}:`, message);

      // Mark as failed if extraction, embedding, or indexing throws
      await this.updateSource(sourceDoc._id.toString(), {
        status: "failed",
        errorMessage: message,
      });
      sourceDoc.status = "failed";
    }

    return sourceDoc;
  }

  async getAllSources() {
    await connectMongoDB();
    return await Source.find().sort({ createdAt: -1 });
  }

  async getSourceById(id: string) {
    await connectMongoDB();
    return await Source.findById(id);
  }

  async getSourcesByNotebookId(notebookId: string) {
    await connectMongoDB();
    return await Source.find({ notebookId }).sort({ createdAt: -1 });
  }

  async updateSource(
    id: string,
    data: {
      title?: string;
      sourceType?: "pdf" | "youtube" | "website" | "text" | "vtt";
      url?: string;
      fileName?: string;
      status?: "processing" | "completed" | "failed";
      errorMessage?: string | null;
      chunkCount?: number;
    }
  ) {
    await connectMongoDB();
    return await Source.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteSource(id: string) {
    await connectMongoDB();

    // Clean up vectors first. Don't let a Qdrant hiccup block the Mongo
    // delete — log it instead, since an orphaned vector is recoverable
    // (re-run a cleanup job) but a stuck "can't delete" UX is worse.
    await vectorService.deleteSourceVectors(id).catch((err) => {
      console.error(`Failed to delete vectors for source ${id}:`, err);
    });

    return await Source.findByIdAndDelete(id);
  }
}

export const sourceService = new SourceService();
