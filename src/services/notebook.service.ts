import connectMongoDB from "@/lib/mongodb";
import { Notebook } from "@/models/Notebook.model"; 


class NotebookService {
  async createNotebook(data: {
    title: string;
    emoji?: string;
    description?: string;
  }) {
    await connectMongoDB();

    return await Notebook.create({
      title: data.title,
      emoji: data.emoji ?? "❌",
      description: data.description ?? "",
    });
  }

  async getAllNotebooks() {
    await connectMongoDB();

    return await Notebook.find().sort({ createdAt: -1 });
  }

  async getNotebookById(id: string) {
    await connectMongoDB();

    return await Notebook.findById(id);
  }

  async updateNotebook(
    id: string,
    data: {
      title?: string;
      emoji?: string;
      description?: string;
    }
  ) {
    await connectMongoDB();

    return await Notebook.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteNotebook(id: string) {
    await connectMongoDB();

    return await Notebook.findByIdAndDelete(id);
  }
}

export const notebookService = new NotebookService();