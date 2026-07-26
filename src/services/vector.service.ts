import { randomUUID } from "crypto";
import { qdrant } from "@/lib/qdrant";
import { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/openai";
import { chunkExtractedText, type ChunkableSourceType } from "@/lib/chunker";

const COLLECTION_NAME = "chaibooklm_chunks";
const EMBED_BATCH_SIZE = 100; // chunks per embeddings API call

export interface RetrievedChunk {
  score: number;
  sourceId: string;
  notebookId: string;
  sourceType: ChunkableSourceType;
  sourceTitle: string;
  url: string | null;
  chunkIndex: number;
  fileUrl: string | null;
  text: string;
  page: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
}

let collectionReady: Promise<void> | null = null;

/** Creates the shared Qdrant collection + required payload indexes on first use. Idempotent. */
async function ensureCollection(): Promise<void> {
  if (!collectionReady) {
    collectionReady = (async () => {
      const { collections } = await qdrant.getCollections();
      const exists = collections.some((c) => c.name === COLLECTION_NAME);

      if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
        });
      }

      await Promise.all([
        qdrant.createPayloadIndex(COLLECTION_NAME, {
          field_name: "sourceId",
          field_schema: "keyword",
        }),
        qdrant.createPayloadIndex(COLLECTION_NAME, {
          field_name: "notebookId",
          field_schema: "keyword",
        }),
      ]);
    })().catch((err) => {
      collectionReady = null; // allow retry on next call
      throw err;
    });
  }
  return collectionReady;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding as number[]);
}

export interface IndexSourceInput {
  sourceId: string;
  notebookId: string;
  sourceType: ChunkableSourceType;
  title: string;
  url?: string;
  fileUrl?: string;
  rawText: string;
}

class VectorService {
  /** Chunks, embeds, and upserts a source's text into Qdrant. */
  async indexSource(input: IndexSourceInput): Promise<{ chunkCount: number }> {
    await ensureCollection();

    const chunks = chunkExtractedText(input.rawText, input.sourceType);

    if (chunks.length === 0) {
      throw new Error("No chunks could be generated from this source.");
    }

    let totalPoints = 0;

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedBatch(batch.map((c) => c.text));

      const points = batch.map((chunk, idx) => ({
        id: randomUUID(),
        vector: embeddings[idx],
        payload: {
          sourceId: input.sourceId,
          notebookId: input.notebookId,
          sourceType: input.sourceType,
          sourceTitle: input.title,
          url: input.url ?? null,
          chunkIndex: chunk.chunkIndex,
          fileUrl: input.fileUrl ?? null,
          text: chunk.text,
          page: chunk.page ?? null,
          startSeconds: chunk.startSeconds ?? null,
          endSeconds: chunk.endSeconds ?? null,
        },
      }));

      await qdrant.upsert(COLLECTION_NAME, { wait: true, points });
      totalPoints += points.length;
    }

    return { chunkCount: totalPoints };
  }

  /** Removes every chunk belonging to a source (called on source delete/re-index). */
  async deleteSourceVectors(sourceId: string): Promise<void> {
    await ensureCollection();
    await qdrant.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [{ key: "sourceId", match: { value: sourceId } }],
      },
    });
  }

  /** Embeds a query and returns the top matching chunks, scoped to one notebook. */
  async searchSimilarChunks(params: {
    notebookId: string;
    query: string;
    topK?: number;
  }): Promise<RetrievedChunk[]> {
    await ensureCollection();

    const [queryEmbedding] = await embedBatch([params.query]);

    const results = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: params.topK ?? 6,
      filter: {
        must: [{ key: "notebookId", match: { value: params.notebookId } }],
      },
      with_payload: true,
    });

    return results.map((r) => ({
      score: r.score,
      ...(r.payload as Omit<RetrievedChunk, "score">),
    }));
  }

  /** Embeds a query and searches, scoped to one notebook — returns raw hits (used by retrieval fusion). */
  async searchByEmbedding(params: {
    notebookId: string;
    vector: number[];
    limit: number;
  }): Promise<RetrievedChunk[]> {
    await ensureCollection();

    const results = await qdrant.search(COLLECTION_NAME, {
      vector: params.vector,
      limit: params.limit,
      filter: {
        must: [{ key: "notebookId", match: { value: params.notebookId } }],
      },
      with_payload: true,
    });

    return results.map((r) => ({
      score: r.score,
      ...(r.payload as Omit<RetrievedChunk, "score">),
    }));
  }

  /**
   * Returns a broad, unranked sample of chunks across an entire notebook
   * (not query-based search) — used by artifact generation (report /
   * flashcards / quiz), which needs representative coverage of everything
   * rather than results for one specific question.
   */
  async getNotebookChunks(notebookId: string, limit = 80): Promise<RetrievedChunk[]> {
    await ensureCollection();

    const results = await qdrant.scroll(COLLECTION_NAME, {
      filter: {
        must: [{ key: "notebookId", match: { value: notebookId } }],
      },
      limit,
      with_payload: true,
      with_vector: false,
    });

    return results.points.map((p) => ({
      score: 1,
      ...(p.payload as Omit<RetrievedChunk, "score">),
    }));
  }

  /** Embeds multiple query strings in one batched OpenAI call. */
  async embedQueries(texts: string[]): Promise<number[][]> {
    return embedBatch(texts);
  }
}

export const vectorService = new VectorService();