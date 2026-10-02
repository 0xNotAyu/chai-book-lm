import prisma from "@/lib/db";
import { sourceService } from "@/services/source.service";


class NotebookService {
  async createNotebook(data: {
    title: string;
    emoji?: string;
    description?: string;
    userId?: string | null;
  }) {
    return prisma.notebook.create({
      data: {
        title: data.title,
        emoji: data.emoji ?? "📙",
        description: data.description ?? "",
        userId: data.userId ?? null,
      },
    });
  }

  async getAllNotebooks(userId: string) {

    // _count replaces the old aggregate + countMap.
    const notebooks = await prisma.notebook.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { sources: true } } },
    });

    return notebooks.map(({ _count, ...nb }) => ({
      ...nb,
      sourceCount: _count.sources,
    }));
  }


  async getNotebookById(id: string) {
    const nb = await prisma.notebook.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!nb) return null;

    // Alias `messages` as `conversations` so the frontend keeps working
    // without changes. Rename it on the client later if you prefer.
    const { messages, ...rest } = nb;
    return { ...rest, conversations: messages };
  }

  async updateNotebook(
    id: string,
    data: { title?: string; emoji?: string; description?: string }
  ) {
    return prisma.notebook.update({ where: { id }, data });
  }

  async deleteNotebook(id: string) {
    // Clean up external resources (Qdrant vectors + Cloudinary) per source.
    // The DB rows (sources, messages, artifacts) are removed by onDelete: Cascade.
    const sources = await prisma.source.findMany({
      where: { notebookId: id },
      select: { id: true },
    });
    await Promise.all(sources.map((s) => sourceService.deleteSource(s.id)));

    return prisma.notebook.delete({ where: { id } });
  }
}

export const notebookService = new NotebookService();