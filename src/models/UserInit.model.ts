import { Schema, model, models } from "mongoose";

const UserInitSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
  },
  { timestamps: true }
);

export const UserInit = models.UserInit || model("UserInit", UserInitSchema);