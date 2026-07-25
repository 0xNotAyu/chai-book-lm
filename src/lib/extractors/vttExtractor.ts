// src/lib/extractors/vttExtractor.ts
import { parse, ParseResult } from "node-webvtt";

interface ExtractedCue {
  timestamp: string;
  text: string;
}

export async function extractVtt(fileBuffer: Buffer): Promise<string> {
  const rawText = fileBuffer.toString("utf-8");
  
  try {
    // Parse with strict mode disabled to handle malformed cues gracefully
    const parsedVtt: ParseResult = parse(rawText, { strict: false });

    if (!parsedVtt.valid || !parsedVtt.cues || parsedVtt.cues.length === 0) {
      const errorDetails = parsedVtt.errors 
        ? `Errors: ${parsedVtt.errors.map(e => e.message).join(", ")}` 
        : "No cues found";
      throw new Error(`Invalid or empty VTT file: ${errorDetails}`);
    }

    // Map cues with explicit typing
    const fullText = parsedVtt.cues.map((cue) => {
      // Format timestamps back to HH:MM:SS.mmm if preferred, or keep seconds
      return `[${cue.start.toFixed(3)}s -> ${cue.end.toFixed(3)}s] ${cue.text.trim()}`;
    }).join("\n");
    
    return fullText.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error parsing VTT:", errorMessage);
    throw new Error(`Failed to extract text from VTT: ${errorMessage}`);
  }
}   