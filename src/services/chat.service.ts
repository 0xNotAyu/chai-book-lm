import  prisma from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { openai, CHAT_MODEL } from "@/lib/openai";
import { retrieveChunksAdvanced, StageEvent } from "@/services/retrieval.service";
import type { RetrievedChunk } from "@/services/vector.service";




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
  | ({ type: "stage" } & StageEvent)
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
    "- The sources are timestamped video/transcript fragments. Relevant information about a single topic is often scattered across MANY separate fragments using DIFFERENT WORDING than the question, not one paragraph using the same words. Actively scan every fragment provided and assemble a complete, combined answer.",
    "- CRITICAL: The user's question is often phrased casually or generally (e.g. 'how do they survive without food') while the source material describes the same real-world concept using specific, concrete terms (e.g. 'scavenging carcasses', 'regurgitating food for cubs', 'hunting voles under snow', 'growing a thick winter coat'). Treat these as directly relevant — do not require literal keyword overlap. Ask yourself: 'does this fragment describe a real answer to what the user is actually asking, even if it uses different words?'",
    "- If the user asks for a list or 'how' something is done, enumerate every distinct strategy/step/item you can find evidence for across ALL fragments, citing each to its source fragment.",
    "- Only say the sources don't contain enough information if you've checked every fragment for thematically related content (not just literal phrase matches) and genuinely found nothing relevant.",
    "- Keep answers well formatted: use bullet points or numbered lists for enumerable content, short paragraphs otherwise.",
    "- Before including any fact, verify it is actually about the subject the user asked about. If a retrieved fragment discusses a different character/topic/entity than the one asked, DO NOT include it.",
    "- If the user's question names a specific person, character, product, or entity, only use fragments that explicitly mention that exact name.",
    "SOURCES:",
    context || "(No relevant sources were found for this question.)",
  ].join("\n");
}
export async function* streamChatAnswer(params: {
  notebookId: string;
  question: string;
}): AsyncGenerator<ChatStreamEvent> {
  const { notebookId, question } = params;

  await prisma.message.create({
    data: { notebookId, role: "user", content: question },
  });

  let fullAnswer = "";
  let citations: ChatCitation[] = [];
  let saved = false;

  const saveAssistantMessage = async () => {
    saved = true; // set first so a failed save can't trigger a second attempt
    await prisma.message.create({
      data: {
        notebookId,
        role: "assistant",
        content: fullAnswer,
        citations: citations as unknown as Prisma.InputJsonValue,
      },
    });
  };

  try {
    // 1. Retrieval with live progress. The retriever reports through a callback,
    // but a generator can only yield from its own body, so events go into a
    // queue that we drain here while retrieval runs.
    const queue: ChatStreamEvent[] = [];
    let wake: (() => void) | null = null;
    const state: { done: boolean; chunks?: RetrievedChunk[]; error?: unknown } = { done: false };

    retrieveChunksAdvanced({
      notebookId,
      query: question,
      onStage: (e) => {
        queue.push({ type: "stage", ...e });
        wake?.();
        wake = null;
      },
    })
      .then(
        (chunks) => { state.chunks = chunks; },
        (error) => { state.error = error; }
      )
      .finally(() => {
        state.done = true;
        wake?.();
        wake = null;
      });

    while (true) {
      while (queue.length) yield queue.shift()!;
      if (state.done) break;
      await new Promise<void>((resolve) => { wake = resolve; });
    }
    if (state.error) throw state.error;
    const chunks = state.chunks ?? [];

    console.log(`\n[RAG DEBUG] notebookId=${notebookId} query="${question}"`);
    console.log(`[RAG DEBUG] retrieved ${chunks.length} chunks`);

    citations = chunks.map((c, i) => ({
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

    // 2. Generation
    const genStart = Date.now();
    const genLabel = `Writing a cited answer from ${chunks.length} passages`;
    yield { type: "stage", stage: "generate", status: "running", label: genLabel };

    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt(chunks) },
        { role: "user", content: question },
      ],
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullAnswer += delta;
        yield { type: "token", content: delta };
      }
    }

    yield { type: "stage", stage: "generate", status: "done", label: genLabel, ms: Date.now() - genStart };
    yield { type: "citations", sources: citations };

    await saveAssistantMessage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate an answer";
    console.error("Chat generation failed:", message);
    yield { type: "error", message };
  } finally {
    // Runs on success, on error, and when the client disconnects mid-stream
    // (the consumer stops iterating, which calls the generator's return()).
    // Whatever was written so far is kept, along with its citations.
    if (!saved && fullAnswer.trim()) {
      await saveAssistantMessage().catch((err) =>
        console.error("Failed to save partial answer:", err)
      );
    }
  }
}
