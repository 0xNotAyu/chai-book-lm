import { Innertube } from "youtubei.js";

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return match?.[1] ?? null;
}

// Reuse one client across warm invocations instead of re-bootstrapping
// on every request.
let clientPromise: Promise<Innertube> | null = null;
function getClient(): Promise<Innertube> {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      lang: "en",
      location: "US",
      retrieve_player: false, // we only need captions, not streaming data
    });
  }
  return clientPromise;
}

export async function extractYoutube(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL.");

  try {
    const yt = await getClient();
    const info = await yt.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    const segments =
      transcriptData?.transcript?.content?.body?.initial_segments ?? [];

    if (!segments.length) {
      throw new Error(
        "This video has no captions/subtitles available (either disabled by the uploader or auto-captions weren't generated)."
      );
    }

    return segments
      .map((seg: any) => {
        const start = Number(seg.start_ms) / 1000;
        const end = Number(seg.end_ms) / 1000;
        const text = (seg.snippet?.text ?? "").trim();
        return text ? `[[T:${start.toFixed(2)}:${end.toFixed(2)}]] ${text}` : null;
      })
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching YouTube transcript:", message);
    throw new Error(message);
  }
}