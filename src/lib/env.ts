import { z } from "zod";

const envSchema = z.object({
  MONGO_URI: z.string().min(1),
  QDRANT_CLUSTER_ENDPOINT: z.string().url(),
  QDRANT_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);