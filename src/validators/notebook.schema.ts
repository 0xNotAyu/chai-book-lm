import { z } from "zod";

export const createNotebookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),

  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

export const updateNotebookSchema = createNotebookSchema.partial();

export type CreateNotebookInput = z.infer<typeof createNotebookSchema>;
export type UpdateNotebookInput = z.infer<typeof updateNotebookSchema>;