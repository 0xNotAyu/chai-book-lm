import connectMongoDB from "@/lib/mongodb";
import Source from "../models/Source.model";
import { vectorService } from "./vector.service";
import { uploadPdfBuffer, deletePdfAsset } from "@/lib/cloudinary";

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
      textContent?: string;
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
    // background job — fine for the scope of this project. The client hides
    // this latency by closing the "Add source" dialog immediately and showing
    // a processing indicator in the source list instead of blocking on this call.
    try {
      let extractedText = "";
      let fileUrl: string | undefined;
      let cloudinaryPublicId: string | undefined;

      switch (data.sourceType) {
        case "pdf": {
          if (!fileBuffer) throw new Error("No file buffer provided for PDF.");
          extractedText = await extractPdf(fileBuffer);
          const uploaded = await uploadPdfBuffer(fileBuffer, data.fileName || `${sourceDoc._id}.pdf`);
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
        fileUrl,
        rawText: extractedText,
      });

      // 3. Mark as completed once extraction + indexing both succeed. Also
      // persist the raw extracted text + cloudinary public_id so re-index
      // and delete can work without re-fetching the original source later.
      await this.updateSource(sourceDoc._id.toString(), {
        status: "completed",
        fileUrl,
        chunkCount,
        cloudinaryPublicId,
        extractedText,
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

  /**
   * Re-index a source: wipes its existing vectors and re-runs
   * chunk -> embed -> store using the extracted text captured during the
   * original ingestion (no need to re-fetch the original file/URL).
   */
  async reindexSource(id: string) {
    await connectMongoDB();

    const source = await Source.findById(id).select("+extractedText");
    if (!source) return null;

    await Source.findByIdAndUpdate(id, { status: "processing", errorMessage: null });

    try {
      if (!source.extractedText || !source.extractedText.trim()) {
        throw new Error("No stored content available to re-index this source.");
      }

      // Remove old vectors before writing new ones so we don't end up with
      // duplicate/stale chunks for this source.
      await vectorService.deleteSourceVectors(id);

      const { chunkCount } = await vectorService.indexSource({
        sourceId: id,
        notebookId: source.notebookId.toString(),
        sourceType: source.sourceType,
        title: source.title,
        url: source.url,
        fileUrl: source.fileUrl ?? undefined,
        rawText: source.extractedText,
      });

      return await this.updateSource(id, { status: "completed", chunkCount, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to re-index source";
      console.error(`Re-index failed for source ${id}:`, message);
      return await this.updateSource(id, { status: "failed", errorMessage: message });
    }
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
    // extractedText / cloudinaryPublicId are select:false in the schema, so
    // they're excluded here automatically — keeps the list payload small.
    return await Source.find({ notebookId }).sort({ createdAt: -1 });
  }

  async updateSource(
    id: string,
    data: {
      title?: string;
      sourceType?: "pdf" | "youtube" | "website" | "text" | "vtt";
      url?: string;
      fileName?: string;
      fileUrl?: string;
      status?: "processing" | "completed" | "failed";
      errorMessage?: string | null;
      chunkCount?: number;
      cloudinaryPublicId?: string;
      extractedText?: string;
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

    // Need cloudinaryPublicId explicitly since it's select:false on the schema.
    const source = await Source.findById(id).select("+cloudinaryPublicId");

    // Clean up vectors first. Don't let a Qdrant hiccup block the Mongo
    // delete — log it instead, since an orphaned vector is recoverable
    // (re-run a cleanup job) but a stuck "can't delete" UX is worse.
    await vectorService.deleteSourceVectors(id).catch((err) => {
      console.error(`Failed to delete vectors for source ${id}:`, err);
    });

    // Clean up the Cloudinary asset for PDF sources. Same logic — log and
    // continue rather than block the delete on a storage-provider hiccup.
    if (source?.cloudinaryPublicId) {
      await deletePdfAsset(source.cloudinaryPublicId).catch((err) => {
        console.error(`Failed to delete Cloudinary asset for source ${id}:`, err);
      });
    }

    return await Source.findByIdAndDelete(id);
  }
}

export const sourceService = new SourceService();
