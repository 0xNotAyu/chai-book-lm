import connectMongoDB from "@/lib/mongodb";
import { Notebook } from "@/models/Notebook.model";
import { openai, CHAT_MODEL } from "@/lib/openai";
import { vectorService, type RetrievedChunk } from "@/services/vector.service";

const TOP_K = 12;

export interface ChatCitation {
  index: number; // matches the [n] markers the model is instructed to cite with
  sourceId: string;
  sourceType: RetrievedChunk["sourceType"];
  title: string;
  snippet: string;
  url: string | null;
  page: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
}

export type ChatStreamEvent =
  | { type: "token"; content: string }
  | { type: "citations"; sources: ChatCitation[] }
  | { type: "error"; message: string };

function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] (Source: "${c.sourceTitle}")\n${c.text}`)
    .join("\n\n---\n\n");

  return [
    "You are a research assistant that answers questions using ONLY the sources provided below.",
    "Rules:",
    '- Ground every claim in the sources. Never use outside knowledge, even if you know the answer.',
    "- Cite using bracket notation like [1] or [2] immediately after the relevant sentence. ALWAYS use square brackets — never write a bare number. Example: 'The Agile model is iterative [2].' NOT 'The Agile model is iterative 2.'",
    "- If the sources don't contain enough information to answer, say so plainly instead of guessing.",
    "- Keep answers concise and well formatted (short paragraphs, bullet points where useful).",
    "- The sources may be short, fragmented transcript snippets rather than complete explanations. Piece together relevant details across multiple fragments to form a coherent answer — you don't need one single passage that fully explains it.",
    "SOURCES:",
    context || "(No relevant sources were found for this question.)",
  ].join("\n");
}

/**
 * Runs the full RAG pipeline for one question and yields streaming events:
 * token-by-token answer text, then a final citations payload. Also persists
 * both the user question and the completed answer to the notebook's
 * conversation history in MongoDB.
 */
export async function* streamChatAnswer(params: {
  notebookId: string;
  question: string;
}): AsyncGenerator<ChatStreamEvent> {
  const { notebookId, question } = params;

  await connectMongoDB();

  // Persist the user's message immediately, before generation starts.
  await Notebook.findByIdAndUpdate(notebookId, {
    $push: { conversations: { role: "user", content: question } },
  });

  try {
    // 1. Retrieve relevant chunks, scoped to this notebook only.
    const chunks = await vectorService.searchSimilarChunks({
      notebookId,
      query: question,
      topK: TOP_K,
    });

    console.log(`\n[RAG DEBUG] notebookId=${notebookId} query="${question}"`);
console.log(`[RAG DEBUG] retrieved ${chunks.length} chunks:`);
chunks.forEach((c) => {
  console.log(`  score=${c.score.toFixed(3)} | ${c.sourceTitle} | "${c.text.slice(0, 100)}..."`);
});

    const citations: ChatCitation[] = chunks.map((c, i) => ({
      index: i + 1,
      sourceId: c.sourceId,
      sourceType: c.sourceType,
      title: c.sourceTitle,
      snippet: c.text,
      url: c.url,
      page: c.page,
      startSeconds: c.startSeconds,
      endSeconds: c.endSeconds,
    }));

    // 2. Stream the grounded answer from the LLM.
    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt(chunks) },
        { role: "user", content: question },
      ],
    });

    let fullAnswer = "";

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullAnswer += delta;
        yield { type: "token", content: delta };
      }
    }

    // 3. Send citation metadata once the answer text is fully streamed, so
    // the client can render clickable [n] chips against the final text.
    yield { type: "citations", sources: citations };

    // 4. Persist the completed assistant answer.
    await Notebook.findByIdAndUpdate(notebookId, {
      $push: { conversations: { role: "assistant", content: fullAnswer } },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate an answer";
    console.error("Chat generation failed:", message);
    yield { type: "error", message };
  }
}