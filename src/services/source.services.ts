import connectMongoDB from "@/lib/mongodb";
import Source from "../models/Source.model";

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

    // 2. Payload Routing & Extraction Phase
    // Note: In serverless Next.js, awaiting this blocks the API response until extraction finishes.
    // For large files, you eventually may want to move this to a background job, but this is perfect for now.
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

      // [UPCOMING STEP] - Chunking + embedding + Qdrant indexing will go here
      // await vectorService.indexDocument(sourceDoc._id, extractedText);

      // 3. Mark as completed upon successful extraction (and future indexing)
      await this.updateSource(sourceDoc._id.toString(), {
        status: "completed",
      });

      // Update local object to reflect the DB change before returning
      sourceDoc.status = "completed";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process source";
      console.error(`Processing failed for source ${sourceDoc._id}:`, message);

      // Mark as failed if the extractor throws an error
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
    return await Source.findByIdAndDelete(id);
  }
}

export const sourceService = new SourceService();
