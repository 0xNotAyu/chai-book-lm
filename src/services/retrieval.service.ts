import { openai, CHAT_MODEL } from "@/lib/openai";
import { vectorService, type RetrievedChunk } from "@/services/vector.service";

interface QueryVariants {
  stepBack: string;
  rewritten: string;
  subQueries: string[];
}

// ---- Pipeline progress reporting ------------------------------------------
export type PipelineStage = "rewrite" | "hyde" | "embed" | "search" | "fusion" | "generate";

export interface StageEvent {
  stage: PipelineStage;
  status: "running" | "done";
  label: string;
  detail?: string | string[];
  ms?: number;
}
export type StageReporter = (e: StageEvent) => void;

async function runStage<T>(
  onStage: StageReporter | undefined,
  stage: PipelineStage,
  label: string,
  fn: () => Promise<T>,
  summarize?: (result: T) => string | string[]
): Promise<T> {
  onStage?.({ stage, status: "running", label });
  const t = Date.now();
  const result = await fn();
  onStage?.({ stage, status: "done", label, detail: summarize?.(result), ms: Date.now() - t });
  return result;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);
// ----------------------------------------------------------------------------

const RRF_K = 60;
const FINAL_K = 35;
const PER_QUERY_LIMIT = 20;

/** Rewrite the user's query into step-back, cleaned-up, and 3 sub-question variants. */
async function queryRewriting(query: string): Promise<QueryVariants> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "query_rewriting",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            stepBack: {
              type: "string",
              description:
                "A broader, higher-level 'step-back' question whose answer gives useful background for the original query.",
            },
            rewritten: {
              type: "string",
              description:
                "The original query with spelling/grammar fixed and made clear and self-contained. Preserve the original intent.",
            },
            subQueries: {
              type: "array",
              description: "Exactly 3 focused sub-questions the original query can be decomposed into.",
              items: { type: "string" },
            },
          },
          required: ["stepBack", "rewritten", "subQueries"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You are a query understanding assistant for a retrieval system. " +
          "Given a user's question, produce query variants that help retrieve relevant documents. " +
          "Apply three techniques: (1) step-back prompting -> one broader background question; " +
          "(2) query rewriting -> fix typos/grammar and make the query explicit and self-contained; " +
          "(3) sub-query decomposition -> break the query into exactly 3 focused sub-questions. " +
          "Respond ONLY with the structured JSON.",
      },
      { role: "user", content: query },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  return {
    stepBack: parsed.stepBack ?? "",
    rewritten: parsed.rewritten ?? query,
    subQueries: Array.isArray(parsed.subQueries) ? parsed.subQueries.slice(0, 3) : [],
  };
}

/** HyDE: write a short hypothetical passage that answers the query, embed that instead of the bare question. */
async function hydeDocument(query: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an expert writer. Write a concise, factual passage (3-5 sentences) that directly answers " +
          "the user's question, as if it were an excerpt from a relevant reference document. " +
          "Write confidently in a neutral, encyclopedic tone. Do not add disclaimers or say you are unsure.",
      },
      { role: "user", content: query },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/** Reciprocal Rank Fusion across multiple ranked lists of chunks. */
function reciprocalRankFusion(
  rankedLists: { label: string; hits: RetrievedChunk[] }[],
  k = RRF_K
): (RetrievedChunk & { rrfScore: number; matchedBy: string[] })[] {
  const fused = new Map<string, RetrievedChunk & { rrfScore: number; matchedBy: string[] }>();

  for (const { label, hits } of rankedLists) {
    hits.forEach((chunk, index) => {
      const rank = index + 1;
      const contribution = 1 / (k + rank);
      // Key by sourceId + chunkIndex since chunks don't carry a stable point id here.
      const key = `${chunk.sourceId}:${chunk.chunkIndex}`;
      const existing = fused.get(key);

      if (existing) {
        existing.rrfScore += contribution;
        existing.score = Math.max(existing.score, chunk.score);
        existing.matchedBy.push(label);
      } else {
        fused.set(key, { ...chunk, rrfScore: contribution, matchedBy: [label] });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Full multi-query retrieval: rewrite the query into variants (typo-fixed,
 * step-back, HyDE hypothetical doc, 3 sub-queries), embed + search all of
 * them in parallel, fuse with RRF, return the top FINAL_K chunks.
 * Reports each stage through `onStage` so the UI can show the pipeline live.
 */
export async function retrieveChunksAdvanced(params: {
  notebookId: string;
  query: string;
  onStage?: StageReporter;
}): Promise<RetrievedChunk[]> {
  const { notebookId, query, onStage } = params;

  const [{ stepBack, rewritten, subQueries }, hyde] = await Promise.all([
    runStage(
      onStage,
      "rewrite",
      "Query rewriting: clean-up, step-back and sub-query decomposition",
      () => queryRewriting(query),
      (v) => [
        `Rewritten: ${v.rewritten}`,
        `Step-back: ${v.stepBack}`,
        ...v.subQueries.map((q, i) => `Sub-query ${i + 1}: ${q}`),
      ]
    ),
    runStage(
      onStage,
      "hyde",
      "HyDE: writing a hypothetical answer to search with",
      () => hydeDocument(query),
      (h) => truncate(h, 280)
    ),
  ]);

  const labelled = [
    { label: "rewritten", text: rewritten },
    { label: "stepBack", text: stepBack },
    { label: "hyde", text: hyde },
    ...subQueries.map((q, i) => ({ label: `subQuery${i + 1}`, text: q })),
  ].filter((v) => v.text && v.text.trim().length > 0);

  const vectors = await runStage(
    onStage,
    "embed",
    `Embedding ${labelled.length} query variants`,
    () => vectorService.embedQueries(labelled.map((v) => v.text)),
    (vs) => `${vs.length} vectors created`
  );

  const resultsPerQuery = await runStage(
    onStage,
    "search",
    `Searching the vector store with ${labelled.length} queries in parallel`,
    () =>
      Promise.all(
        vectors.map((vector) =>
          vectorService.searchByEmbedding({ notebookId, vector, limit: PER_QUERY_LIMIT })
        )
      ),
    (lists) =>
      `${lists.reduce((n, l) => n + l.length, 0)} candidate chunks (up to ${PER_QUERY_LIMIT} per query)`
  );

  const rankedLists = labelled.map((v, i) => ({ label: v.label, hits: resultsPerQuery[i] }));

  const fused = await runStage(
    onStage,
    "fusion",
    "Merging results with Reciprocal Rank Fusion (RRF)",
    async () => reciprocalRankFusion(rankedLists),
    (f) => [
      `${f.length} unique passages after de-duplication`,
      `${f.filter((c) => c.matchedBy.length > 1).length} matched by 2+ query variants`,
      `Keeping the top ${Math.min(FINAL_K, f.length)}`,
    ]
  );

  return fused.slice(0, FINAL_K);
}