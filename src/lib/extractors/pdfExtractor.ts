import { PDFParse } from "pdf-parse";

/**
 * Extracts text from a PDF with [[PAGE:n]] markers inserted before each
 * page's content, so the chunker can tag every chunk with its exact page
 * number for citations.
 *
 * pdf-parse v2 replaced the old callable-function API with a `PDFParse`
 * class (`getInfo()`, `getText()`, etc). There's no more `pagerender`
 * hook — the documented way to get a single page's text is
 * `getText({ partial: [pageNumber] })` (1-based). We call that once per
 * page against the same parser instance (the PDF is only loaded/parsed
 * once; each getText() call just re-renders the requested page range).
 */
export async function extractPdf(fileBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const info = await parser.getInfo();
    const numPages: number = info.total || 1;

    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const result = await parser.getText({ partial: [pageNum] });
      pageTexts.push((result.text || "").trim());
    }

    const markedText = pageTexts
      .map((pageText, i) => `[[PAGE:${i + 1}]]\n${pageText}`)
      .join("\n\n");

    if (!markedText.replace(/\[\[PAGE:\d+\]\]/g, "").trim()) {
      throw new Error("No extractable text found in PDF");
    }

    return markedText.trim();
  } catch (error) {
    // TEMP DIAGNOSTIC: surface the real underlying error message (instead of
    // a generic one) so it shows up directly in Mongo's `errorMessage` field
    // without needing to dig through server terminal logs.
    const rawMessage = error instanceof Error ? error.message : String(error);
    const rawStack = error instanceof Error ? error.stack?.split("\n")[1]?.trim() : "";
    console.error("Error parsing PDF:", rawMessage, rawStack);
    throw new Error(`PDF extraction failed — raw error: ${rawMessage}`);
  } finally {
    // Always release the underlying pdf.js document/worker resources
    await parser.destroy();
  }
}