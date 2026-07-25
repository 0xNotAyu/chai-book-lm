import { Types } from "mongoose";

export type SourceType = "pdf" | "youtube" | "website" | "text" | "vtt";

export type SourceStatus =
  | "processing"
  | "completed"
  | "failed";

export interface Source {
  _id?: Types.ObjectId;

  notebookId: Types.ObjectId;

  title: string;

  sourceType: SourceType;

  url?: string;

  fileName?: string;

  status: SourceStatus;

  errorMessage?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}
