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
      enum: ["pdf", "youtube", "website", "text", "vtt"],
      required: true,
    },

    url: String,

    fileName: String,

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },

    errorMessage: {
      type: String,
      default: null,
    },

    // Number of vector chunks stored in Qdrant for this source (set after
    // successful indexing). Useful for UI display + sanity-checking retrieval.
    chunkCount: {
      type: Number,
      default: 0,
    },
    fileUrl: { type: String, default: null },

    // Cloudinary public_id for uploaded PDFs, needed to delete the asset on
    // source delete/re-upload. Not exposed to the client.
    cloudinaryPublicId: { type: String, default: null, select: false },

    // The raw extracted text (post extraction, pre-chunking) for this source.
    // Kept so "Re-index" can re-chunk + re-embed without re-fetching the
    // original file/URL/transcript. Excluded from normal list queries since
    // it can be large — select it explicitly only when needed for re-index.
    extractedText: { type: String, default: null, select: false },
  },
  {
    timestamps: true,
  }
);

export default models.Source || model("Source", SourceSchema);
