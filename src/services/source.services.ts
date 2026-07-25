
import connectMongoDB from "@/lib/mongodb";
import Source from "../models/Source.model";


import { 
  extractPdf, 
  extractYoutube, 
  extractWebsite, 
  extractText 
} from "@/lib/extractors/index";

class SourceService {
  async createSource(
    data: {
      notebookId: string;
      title: string;
      sourceType: "pdf" | "youtube" | "website" | "text";
      url?: string;
      fileName?: string;
      textContent?: string; // Added to pass raw pasted text down
      status?: "processing" | "completed" | "failed";
    },
    fileBuffer?: Buffer // Added to pass PDF binary data down
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
        
        case "youtube":
          if (!data.url) throw new Error("No URL provided for YouTube.");
          extractedText = await extractYoutube(data.url);
          break;
        
        case "website":
          if (!data.url) throw new Error("No URL provided for Website.");
          extractedText = await extractWebsite(data.url);
          break;
        
        case "text":
          if (!data.textContent) throw new Error("No text content provided.");
          extractedText = await extractText(data.textContent);
          break;
        
        default:
          throw new Error(`Unsupported source type: ${data.sourceType}`);
      }

      // [UPCOMING STEP] - Indexing to Qdrant will go here
      // await vectorService.indexDocument(sourceDoc._id, extractedText);

      // 3. Mark as completed upon successful extraction (and future indexing)
      await this.updateSource(sourceDoc._id.toString(), { status: "completed" });
      
      // Update local object to reflect the DB change before returning
      sourceDoc.status = "completed"; 

    } catch (error) {
      console.error(`Processing failed for source ${sourceDoc._id}:`, error);
      
      // Mark as failed if the extractor throws an error
      await this.updateSource(sourceDoc._id.toString(), { status: "failed" });
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
      sourceType?: "pdf" | "youtube" | "website" | "text";
      url?: string;
      fileName?: string;
      status?: "processing" | "completed" | "failed";
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