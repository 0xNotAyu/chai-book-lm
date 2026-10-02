// src/inngest/functions.ts
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";
import { vectorService } from "@/services/vector.service";
import { extractYoutube, extractWebsite } from "@/lib/extractors/index";
import {
  generateReport,
  generateFlashcards,
  generateQuiz,
} from "@/services/artifact.service";

export const processSource = inngest.createFunction(
  {
    id: "process-source",
    retries: 3,
    concurrency: { limit: 5 }, // protects your OpenAI rate limits
    // v4: triggers live in this object. On v3, pass `{ event: "source/process" }`
    // as the second argument to createFunction instead.
    triggers: [{ event: "source/process" }],
    onFailure: async ({ event, error }) => {
      const sourceId = event.data.event.data.sourceId as string;
      await prisma.source.update({
        where: { id: sourceId },
        data: { status: "failed", errorMessage: error.message },
      });
    },
  },
  async ({ event, step }) => {
    const { sourceId } = event.data as { sourceId: string };

    // Step 1: get text. Uploaded files were already extracted in the API
    // route; URL-based sources are fetched here.
    await step.run("extract-text", async () => {
      const src = await prisma.source.findUnique({
        where: { id: sourceId },
        select: { sourceType: true, url: true, extractedText: true },
      });
      if (!src) throw new NonRetriableError("Source not found");
      if (src.extractedText?.trim()) return;

      let text = "";
      if (src.sourceType === "youtube" && src.url) text = await extractYoutube(src.url);
      else if (src.sourceType === "website" && src.url) text = await extractWebsite(src.url);
      else {
        throw new NonRetriableError(
          "No stored content available to index this source. Please delete and re-upload it."
        );
      }

      if (!text.trim()) {
        throw new NonRetriableError("No content could be extracted from this source.");
      }
      await prisma.source.update({ where: { id: sourceId }, data: { extractedText: text } });
    });

    // Step 2: chunk -> embed -> Qdrant. Wipes old vectors first so a retry
    // (or a re-index) never leaves duplicates.
    const chunkCount = await step.run("index-vectors", async () => {
      const src = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
      await vectorService.deleteSourceVectors(sourceId);
      const { chunkCount } = await vectorService.indexSource({
        sourceId,
        notebookId: src.notebookId,
        sourceType: src.sourceType,
        title: src.title,
        url: src.url ?? undefined,
        fileUrl: src.fileUrl ?? undefined,
        rawText: src.extractedText!,
      });
      return chunkCount;
    });

    // Step 3: mark done
    await step.run("mark-completed", () =>
      prisma.source.update({
        where: { id: sourceId },
        data: { status: "completed", chunkCount, errorMessage: null },
        select: { id: true },
      })
    );
  }
);

export const generateArtifact = inngest.createFunction(
  {
    id: "generate-artifact",
    retries: 1,
    concurrency: { limit: 3 },
    triggers: [{ event: "artifact/generate" }],
    onFailure: async ({ event, error }) => {
      const { artifactId } = event.data.event.data as { artifactId: string };
      await prisma.artifact.update({
        where: { id: artifactId },
        data: { status: "failed", errorMessage: error.message },
      });
    },
  },
  async ({ event, step }) => {
    const { artifactId, notebookId, notebookTitle, type } = event.data as {
      artifactId: string;
      notebookId: string;
      notebookTitle: string;
      type: "report" | "flashcards" | "quiz";
    };

    const content = await step.run("generate-content", async () => {
      if (type === "report") return generateReport(notebookId, notebookTitle);
      if (type === "flashcards") return generateFlashcards(notebookId, notebookTitle);
      return generateQuiz(notebookId, notebookTitle);
    });

    await step.run("save-artifact", () =>
      prisma.artifact.update({
        where: { id: artifactId },
        data: { content, status: "completed", errorMessage: null },
        select: { id: true },
      })
    );
  }
);