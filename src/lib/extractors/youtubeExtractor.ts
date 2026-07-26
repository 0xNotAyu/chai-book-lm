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
    throw new Error(
      "Couldn't fetch this video's transcript — YouTube often blocks cloud servers from doing this. Try one of our demo notebooks, or upload a .vtt transcript file instead."
    );
  }
}