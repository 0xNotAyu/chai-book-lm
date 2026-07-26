import connectMongoDB from "@/lib/mongodb";
import { Notebook } from "@/models/Notebook.model";
import Source from "@/models/Source.model";
import { UserInit } from "@/models/UserInit.model";
import { sourceService } from "@/services/source.services";
import { vectorService } from "@/services/vector.service";

class NotebookService {
  async createNotebook(data: {
    title: string;
    emoji?: string;
    description?: string;
    userId?: string | null
  }) {
    await connectMongoDB();

    return await Notebook.create({
      title: data.title,
      emoji: data.emoji ?? "📙",
      description: data.description ?? "",
      userId: data.userId ?? null,
    });
  }

 async getAllNotebooks(userId: string) {
    await connectMongoDB();
    await this.ensureDemoNotebooksFor(userId);

    const notebooks = await Notebook.find({ userId }).sort({ createdAt: -1 }).lean();
    const counts = await Source.aggregate([
      { $match: { notebookId: { $in: notebooks.map((n) => n._id) } } },
      { $group: { _id: "$notebookId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    return notebooks.map((nb) => ({ ...nb, sourceCount: countMap.get(nb._id.toString()) ?? 0 }));
  }

private async ensureDemoNotebooksFor(userId: string) {
    // Try to atomically "claim" initialization for this user. If a doc
    // already exists (from an earlier request, finished or in-flight), the
    // unique index on userId makes this throw a duplicate-key error — that's
    // our signal to skip cloning entirely.
    try {
      await UserInit.create({ userId, status: "pending" });
    } catch (err: any) {
      if (err?.code === 11000) return; // already claimed — someone else is/was doing this
      console.error("UserInit claim failed:", err);
      throw err;
    }

    try {
      const templates = await Notebook.find({ isDemo: true, userId: null });

      await Promise.all(
        templates.map(async (template) => {
          const clone = await Notebook.create({
            title: template.title,
            emoji: template.emoji,
            description: template.description,
            userId,
            isDemo: false,
            conversations: [],
          });

          const sources = await Source.find({ notebookId: template._id }).select("+extractedText");

          await Promise.all(
            sources.map(async (src) => {
              const newSource = await Source.create({
                notebookId: clone._id,
                title: src.title,
                sourceType: src.sourceType,
                url: src.url,
                fileName: src.fileName,
                fileUrl: src.fileUrl,
                status: src.status,
                chunkCount: src.chunkCount,
                extractedText: src.extractedText,
              });
              await vectorService.cloneSourceVectors(
                src._id.toString(),
                newSource._id.toString(),
                clone._id.toString()
              );
            })
          );
        })
      );

      await UserInit.updateOne({ userId }, { status: "done" });
    } catch (error) {
      console.error("Demo notebook cloning failed:", error);
      // Roll back the lock so a later request can retry instead of the
      // user being permanently stuck with zero notebooks.
      await UserInit.deleteOne({ userId });
      throw error;
    }
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