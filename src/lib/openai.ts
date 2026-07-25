import OpenAI from "openai";
import { env } from "./env";

// Using the OpenAI SDK, pointed at a third-party OpenAI-compatible proxy
// instead of api.openai.com. Same SDK, same call shapes — just a different
// baseURL. Used for both embeddings (M4) and chat completions (M5).
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
});

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL = "gpt-4o-mini";
