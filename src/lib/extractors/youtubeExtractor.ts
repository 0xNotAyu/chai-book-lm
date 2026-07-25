import { YoutubeTranscript } from "youtube-transcript";

export async function extractYoutube(url: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    // The package returns an array of objects with { text, duration, offset }
    // We map over it to grab just the text and join it into a single paragraph
    const fullText = transcript.map(item => item.text).join(" ");
    return fullText;
  } catch (error) {
    console.error("Error fetching YouTube transcript:", error);
    throw new Error("Failed to extract transcript from YouTube video. Ensure it has captions enabled.");
  }
}