import connectMongoDB from "@/lib/mongodb";
import { Notebook } from "@/models/Notebook.model";
import { openai, CHAT_MODEL } from "@/lib/openai";
import { retrieveChunksAdvanced } from "@/services/retrieval.service";
import type { RetrievedChunk } from "@/services/vector.service"


export interface ChatCitation {
  index: number; // matches the [n] markers the model is instructed to cite with
  sourceId: string;
  sourceType: RetrievedChunk["sourceType"];
  title: string;
  snippet: string;
  url: string | null;
  fileUrl: string | null;
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
    "",
    "CITATION RULES (follow exactly):",
    "- Cite every factual claim with the source number in square brackets, e.g. [1].",
    "Example of correct citation: 'Steve has strong evasion options [1][4].'",
    "Example of WRONG citation (never do this): 'Steve has strong evasion options 14.'",
    "- Never invent a citation number that isn't in the SOURCES list below.",
    "",
    "ANSWER QUALITY RULES:",
    "- The sources are timestamped video/transcript fragments. Relevant information about a single topic (e.g. a list of moves, stances, or techniques) is often scattered across MANY separate fragments, not one paragraph. Actively scan every fragment provided and assemble a complete, combined answer — do not stop at the first fragment that seems related.",
    "- If the user asks for a list (moves, stances, steps, etc.), enumerate every distinct item you can find evidence for across ALL fragments, citing each item to its source fragment.",
    "- Only say the sources don't contain enough information if you've checked every fragment and genuinely found nothing relevant — not if the information is merely spread out or partial.",
    "- Keep answers well formatted: use bullet points or numbered lists for enumerable content, short paragraphs otherwise.",
    "- Before including any fact, verify it is actually about the subject the user asked about. If a retrieved fragment discusses a different character/topic/entity than the one asked, DO NOT include it — even if it's tangentially related or appeared in the search results.",
    "- If the user's question names a specific person, character, product, or entity, only use fragments that explicitly mention that exact name. Ignore fragments about a different named entity even if the topic is similar.",
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
    const chunks = await retrieveChunksAdvanced({ notebookId, query: question });

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
      fileUrl: c.fileUrl,
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
      $push: { conversations: { role: "assistant", content: fullAnswer , citations} },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate an answer";
    console.error("Chat generation failed:", message);
    yield { type: "error", message };
  }
}