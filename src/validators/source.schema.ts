import { z } from "zod";

export const createSourceSchema = z.object({
  notebookId: z.string().min(1, "Notebook ID is required"),

  title: z.string().trim().min(1).max(100),

  sourceType: z.enum(["pdf", "youtube", "website", "text", "vtt"]),

  url: z.string().url().optional(),

  fileName: z.string().optional(),

  // Raw pasted text (used for "text" sources that come from the paste-text
  // dialog step, as opposed to an uploaded .txt file which is read from the
  // multipart file buffer instead).
  textContent: z.string().optional(),

  status: z
    .enum(["processing", "completed", "failed"])
    .default("processing"),
});

export const updateSourceSchema = createSourceSchema.partial();

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
