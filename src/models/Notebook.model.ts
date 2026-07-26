import { Schema, model, models } from "mongoose";

const CitationSchema = new Schema(
  {
    index: Number,
    sourceId: String,
    sourceType: String,
    title: String,
    snippet: String,
    url: { type: String, default: null },
    page: { type: Number, default: null },
    startSeconds: { type: Number, default: null },
    endSeconds: { type: Number, default: null },
    fileUrl: { type: String, default: null }, // ← was missing
  },
  { _id: false }
);

const MessageSchema = new Schema(
    {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    citations: { type: [CitationSchema], default: undefined },
  },
  { _id: false, timestamps: true }
);



const NotebookSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      default: "📙",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },

    conversations: {
      type: [MessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Notebook = models.Notebook || model("Notebook", NotebookSchema);