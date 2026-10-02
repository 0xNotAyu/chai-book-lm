import prisma from "@/lib/db";
import { sourceService } from "@/services/source.service";
import { vectorService } from "@/services/vector.service";

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
    await this.ensureDemoNotebooksFor(userId);

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

  private async ensureDemoNotebooksFor(userId: string) {
    // Atomically claim initialization. The unique index on userId means a
    // second concurrent request inserts 0 rows and bails out.
    const claim = await prisma.userInit.createMany({
      data: [{ userId, status: "pending" }],
      skipDuplicates: true,
    });
    if (claim.count === 0) return;

    try {
      const templates = await prisma.notebook.findMany({
        where: { isDemo: true, userId: null },
      });

      await Promise.all(
        templates.map(async (template) => {
          const clone = await prisma.notebook.create({
            data: {
              title: template.title,
              emoji: template.emoji,
              description: template.description,
              userId,
              isDemo: false,
            },
          });

          // extractedText is included by default on a plain findMany.
          const sources = await prisma.source.findMany({
            where: { notebookId: template.id },
          });

          await Promise.all(
            sources.map(async (src) => {
              const newSource = await prisma.source.create({
                data: {
                  notebookId: clone.id,
                  title: src.title,
                  sourceType: src.sourceType,
                  url: src.url,
                  fileName: src.fileName,
                  fileUrl: src.fileUrl,
                  status: src.status,
                  chunkCount: src.chunkCount,
                  extractedText: src.extractedText,
                },
                select: { id: true },
              });
              await vectorService.cloneSourceVectors(src.id, newSource.id, clone.id);
            })
          );
        })
      );

      await prisma.userInit.update({ where: { userId }, data: { status: "done" } });
    } catch (error) {
      console.error("Demo notebook cloning failed:", error);
      // Release the lock so a later request can retry.
      await prisma.userInit.deleteMany({ where: { userId } });
      throw error;
    }
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