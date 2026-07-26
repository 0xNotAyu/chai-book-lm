import { Schema, model, models } from "mongoose";

export type ArtifactType = "report" | "flashcards" | "quiz";
export type ArtifactStatus = "generating" | "completed" | "failed";

const ArtifactSchema = new Schema(
  {
    notebookId: {
      type: Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
    },
    type: {
      type: String,
      enum: ["report", "flashcards", "quiz"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["generating", "completed", "failed"],
      default: "generating",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    // Shape depends on `type`:
    //  report     -> { markdown: string }
    //  flashcards -> { cards: { front: string; back: string }[] }
    //  quiz       -> { questions: { question, options[4], answerIndex, explanation }[] }
    content: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

ArtifactSchema.index({ notebookId: 1, createdAt: -1 });

export const Artifact = models.Artifact || model("Artifact", ArtifactSchema);