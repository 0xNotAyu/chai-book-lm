import { z } from "zod";

export const createArtifactSchema = z.object({
  type: z.enum(["report", "flashcards", "quiz"]),
});

export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;