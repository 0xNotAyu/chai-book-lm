import { YoutubeTranscript } from "youtube-transcript";

/**
 * Extracts a transcript from a YouTube video with [[T:start:end]] markers
 * (seconds) before each segment, so the chunker can tag every chunk with a
 * timestamp range for "jump to this moment" citations.
 *
 * Note: `youtube-transcript` reports `offset`/`duration` in seconds.
 */
export async function extractYoutube(url: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);

    const fullText = transcript
      .map((item) => {
        const start = item.offset;
        const end = item.offset + item.duration;
        const cleanText = item.text.replace(/\s+/g, " ").trim();
        return `[[T:${start.toFixed(2)}:${end.toFixed(2)}]] ${cleanText}`;
      })
      .join("\n");

    return fullText.trim();
  } catch (error) {
    console.error("Error fetching YouTube transcript:", error);
    throw new Error("Failed to extract transcript from YouTube video. Ensure it has captions enabled.");
  }
}
