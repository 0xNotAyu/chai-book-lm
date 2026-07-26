import { openai, CHAT_MODEL } from "@/lib/openai";
import { vectorService, type RetrievedChunk } from "@/services/vector.service";

interface QueryVariants {
  stepBack: string;
  rewritten: string;
  subQueries: string[];
}

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
 */
export async function retrieveChunksAdvanced(params: {
  notebookId: string;
  query: string;
}): Promise<RetrievedChunk[]> {
  const { notebookId, query } = params;

  const [{ stepBack, rewritten, subQueries }, hyde] = await Promise.all([
    queryRewriting(query),
    hydeDocument(query),
  ]);

  const labelled = [
    { label: "rewritten", text: rewritten },
    { label: "stepBack", text: stepBack },
    { label: "hyde", text: hyde },
    ...subQueries.map((q, i) => ({ label: `subQuery${i + 1}`, text: q })),
  ].filter((v) => v.text && v.text.trim().length > 0);

  const vectors = await vectorService.embedQueries(labelled.map((v) => v.text));

  const resultsPerQuery = await Promise.all(
    vectors.map((vector) =>
      vectorService.searchByEmbedding({ notebookId, vector, limit: PER_QUERY_LIMIT })
    )
  );

  const rankedLists = labelled.map((v, i) => ({ label: v.label, hits: resultsPerQuery[i] }));
  const fused = reciprocalRankFusion(rankedLists);

  return fused.slice(0, FINAL_K);
}