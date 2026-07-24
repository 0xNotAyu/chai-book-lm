import connectMongoDB from "@/lib/mongodb";
import Source from "@/models/source.model"

class SourceService {
  async createSource(data: {
    notebookId: string;
    title: string;
    sourceType: "pdf" | "youtube" | "website" | "text";
    url?: string;
    fileName?: string;
    status?: "processing" | "completed" | "failed";
  }) {
    await connectMongoDB();

    return await Source.create({
      ...data,
      status: data.status ?? "processing",
    });
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