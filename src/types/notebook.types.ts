import { Types } from "mongoose";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Notebook {
  _id?: Types.ObjectId;

  title: string;
  emoji?: string;
  description?: string;

  conversations: ConversationMessage[];

  createdAt?: Date;
  updatedAt?: Date;
}