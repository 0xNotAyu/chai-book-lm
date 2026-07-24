import { Schema, model, models } from "mongoose";

export const SourceSchema = new Schema(
  {
    notebookId: {
      type: Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    sourceType: {
      type: String,
      enum: ["pdf", "youtube", "website", "text"],
      required: true,
    },

    url: String,

    fileName: String,

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
  },
  {
    timestamps: true,
  }
);

export default models.Source || model("Source", SourceSchema);