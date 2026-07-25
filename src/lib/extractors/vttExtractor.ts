// src/lib/extractors/vttExtractor.ts
import { parse, ParseResult } from "node-webvtt";

/**
 * Extracts text from a VTT file with [[T:start:end]] markers (seconds)
 * before each cue, so the chunker can tag every chunk with an accurate
 * timestamp range for "jump to this moment" citations.
 */
export async function extractVtt(fileBuffer: Buffer): Promise<string> {
  const rawText = fileBuffer.toString("utf-8");

  try {
    // Parse with strict mode disabled to handle malformed cues gracefully
    const parsedVtt: ParseResult = parse(rawText, { strict: false });

    if (!parsedVtt.valid || !parsedVtt.cues || parsedVtt.cues.length === 0) {
      const errorDetails = parsedVtt.errors
        ? `Errors: ${parsedVtt.errors.map((e) => e.message).join(", ")}`
        : "No cues found";
      throw new Error(`Invalid or empty VTT file: ${errorDetails}`);
    }

    const fullText = parsedVtt.cues
      .map((cue) => {
        const cleanText = cue.text.trim().replace(/\s+/g, " ");
        return `[[T:${cue.start.toFixed(2)}:${cue.end.toFixed(2)}]] ${cleanText}`;
      })
      .join("\n");

    return fullText.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error parsing VTT:", errorMessage);
    throw new Error(`Failed to extract text from VTT: ${errorMessage}`);
  }
}
