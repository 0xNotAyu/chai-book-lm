import "server-only";
// @ts-expect-error
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Extracts text from a PDF with [[PAGE:n]] markers.
 */
export async function extractPdf(fileBuffer: Buffer): Promise<string> {
  let pageNum = 0;

  try {
    const data = await pdfParse(fileBuffer, {
      pagerender: async (pageData: any) => {
        pageNum++;

        const textContent = await pageData.getTextContent();

        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        return `[[PAGE:${pageNum}]]\n${pageText}`;
      },
    });

    const text = (data.text ?? "").trim();

    if (!text.replace(/\[\[PAGE:\d+\]\]/g, "").trim()) {
      throw new Error("No extractable text found in PDF.");
    }

    return text;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("PDF parsing failed:", message);
    throw new Error(`PDF extraction failed: ${message}`);
  }
}