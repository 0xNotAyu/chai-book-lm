import { z } from "zod";

export const createSourceSchema = z.object({
  notebookId: z.string().min(1, "Notebook ID is required"),

  title: z.string().trim().min(1).max(100),

  sourceType: z.enum(["pdf", "youtube", "website", "text"]),

  url: z.string().url().optional(),

  fileName: z.string().optional(),

  status: z
    .enum(["processing", "completed", "failed"])
    .default("processing"),
});

export const updateSourceSchema = createSourceSchema.partial();

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;