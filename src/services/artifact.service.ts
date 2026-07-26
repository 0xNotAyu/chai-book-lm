import connectMongoDB from "@/lib/mongodb";
import { Artifact, type ArtifactType } from "@/models/Artifact.model";
import { openai, CHAT_MODEL } from "@/lib/openai";
import { vectorService } from "@/services/vector.service";

const MAX_CONTEXT_CHUNKS = 80;
const MAX_CONTEXT_CHARS = 24000; // keeps the prompt a sane size regardless of notebook size

async function buildContext(notebookId: string): Promise<string> {
  const chunks = await vectorService.getNotebookChunks(notebookId, MAX_CONTEXT_CHUNKS);
  if (chunks.length === 0) {
    throw new Error("This notebook has no indexed content yet.");
  }

  let context = "";
  for (const c of chunks) {
    const piece = `[Source: ${c.sourceTitle}]\n${c.text}\n\n`;
    if (context.length + piece.length > MAX_CONTEXT_CHARS) break;
    context += piece;
  }
  return context;
}

async function generateReport(notebookId: string, notebookTitle: string) {
  const context = await buildContext(notebookId);

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a research analyst. Write a clear, well-structured report in Markdown based ONLY on " +
          "the provided source material. Use headings (##), short paragraphs, and bullet points where " +
          "useful. Include an 'Overview' section, a few thematic sections, and a brief 'Key Takeaways' " +
          "section at the end. Do not invent facts not present in the sources.",
      },
      {
        role: "user",
        content: `Notebook: "${notebookTitle}"\n\nSOURCE MATERIAL:\n${context}\n\nWrite the report now.`,
      },
    ],
  });

  const markdown = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!markdown) throw new Error("Failed to generate report content.");

  return { markdown };
}

async function generateFlashcards(notebookId: string, notebookTitle: string) {
  const context = await buildContext(notebookId);

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.4,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "flashcards",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            cards: {
              type: "array",
              minItems: 8,
              maxItems: 16,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  front: { type: "string", description: "A short question or term." },
                  back: { type: "string", description: "The concise answer or definition." },
                },
                required: ["front", "back"],
              },
            },
          },
          required: ["cards"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You create study flashcards from source material. Generate 8-16 flashcards covering the most " +
          "important concepts, facts, and terms. Keep 'front' short (a question or term) and 'back' concise " +
          "(1-3 sentences). Base every card ONLY on the provided sources.",
      },
      {
        role: "user",
        content: `Notebook: "${notebookTitle}"\n\nSOURCE MATERIAL:\n${context}\n\nGenerate the flashcards now.`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error("Failed to generate flashcards.");
  }
  return { cards: parsed.cards };
}

async function generateQuiz(notebookId: string, notebookTitle: string) {
  const context = await buildContext(notebookId);

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.4,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quiz",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            questions: {
              type: "array",
              minItems: 5,
              maxItems: 10,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 4,
                    maxItems: 4,
                  },
                  answerIndex: {
                    type: "integer",
                    description: "Index (0-3) of the correct option in `options`.",
                  },
                  explanation: {
                    type: "string",
                    description: "One sentence explaining why the answer is correct.",
                  },
                },
                required: ["question", "options", "answerIndex", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You create multiple-choice quizzes from source material. Generate 5-10 questions, each with " +
          "exactly 4 options and one correct answerIndex (0-3). Base every question ONLY on the provided " +
          "sources. Vary difficulty and cover different parts of the material.",
      },
      {
        role: "user",
        content: `Notebook: "${notebookTitle}"\n\nSOURCE MATERIAL:\n${context}\n\nGenerate the quiz now.`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("Failed to generate quiz.");
  }
  return { questions: parsed.questions };
}

class ArtifactService {
  async generate(notebookId: string, notebookTitle: string, type: ArtifactType) {
    await connectMongoDB();

    const artifactDoc = await Artifact.create({
      notebookId,
      type,
      title: `${notebookTitle} — ${type[0].toUpperCase()}${type.slice(1)}`,
      status: "generating",
      content: null,
    });

    try {
      let content;
      if (type === "report") content = await generateReport(notebookId, notebookTitle);
      else if (type === "flashcards") content = await generateFlashcards(notebookId, notebookTitle);
      else content = await generateQuiz(notebookId, notebookTitle);

      artifactDoc.content = content;
      artifactDoc.status = "completed";
      await artifactDoc.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate artifact";
      artifactDoc.status = "failed";
      artifactDoc.errorMessage = message;
      await artifactDoc.save();
    }

    return artifactDoc;
  }

  async getById(id: string) {
    await connectMongoDB();
    return await Artifact.findById(id);
  }

  async listByNotebook(notebookId: string) {
    await connectMongoDB();
    return await Artifact.find({ notebookId }).sort({ createdAt: -1 });
  }

  async delete(id: string) {
    await connectMongoDB();
    return await Artifact.findByIdAndDelete(id);
  }
}

export const artifactService = new ArtifactService();