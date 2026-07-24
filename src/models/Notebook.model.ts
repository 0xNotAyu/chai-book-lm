import { Schema, model, models } from "mongoose";

const MessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);

const NotebookSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
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