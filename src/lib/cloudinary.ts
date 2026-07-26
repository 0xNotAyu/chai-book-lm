import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadedPdf {
  url: string;
  publicId: string;
}

export function uploadPdfBuffer(buffer: Buffer, fileName: string): Promise<UploadedPdf> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "chaibooklm/pdfs",
        public_id: fileName.replace(/\.pdf$/i, ""),
        format: "pdf",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Deletes an uploaded PDF asset from Cloudinary by its public_id.
 * Used on source delete/re-index so we don't leak storage. Resolves
 * silently (doesn't throw) on "not found" since that's not a real failure —
 * the caller just wants the asset gone either way.
 */
export async function deletePdfAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset ${publicId}:`, error);
    throw error;
  }
}
