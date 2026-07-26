import connectMongoDB from "@/lib/mongodb";
import { Notebook } from "@/models/Notebook.model";
import Source from "@/models/Source.model";
import { sourceService } from "@/services/source.services";

class NotebookService {
  async createNotebook(data: {
    title: string;
    emoji?: string;
    description?: string;
  }) {
    await connectMongoDB();

    return await Notebook.create({
      title: data.title,
      emoji: data.emoji ?? "📙",
      description: data.description ?? "",
    });
  }

  async getAllNotebooks() {
    await connectMongoDB();

    const notebooks = await Notebook.find().sort({ createdAt: -1 }).lean();

    // Real source counts per notebook, computed in one aggregation instead
    // of an N+1 query per card.
    const counts = await Source.aggregate([
      { $group: { _id: "$notebookId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return notebooks.map((nb) => ({
      ...nb,
      sourceCount: countMap.get(nb._id.toString()) ?? 0,
    }));
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

    // Cascade: a notebook delete should leave nothing orphaned behind —
    // wipe each source's vectors + Cloudinary asset + Mongo doc first.
    const sources = await Source.find({ notebookId: id }).select("_id");
    await Promise.all(sources.map((s) => sourceService.deleteSource(s._id.toString())));

    return await Notebook.findByIdAndDelete(id);
  }
}

export const notebookService = new NotebookService();