import { YoutubeTranscript } from "youtube-transcript";

export async function extractYoutube(url: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);

    const fullText = transcript
      .map((item) => {
        const start = item.offset / 1000;
        const end = (item.offset + item.duration) / 1000;
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