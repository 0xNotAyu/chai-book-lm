// src/lib/extractors/youtubeExtractor.ts
//
// No longer uses the `youtube-transcript` npm package (fragile — it wraps
// an internal scraping flow that breaks whenever YouTube changes markup).
// Instead we pull the caption track URL straight out of the video's
// player response and fetch the timedtext XML ourselves. Same result,
// fewer moving parts, clearer failure reasons.

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" = auto-generated
}

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return match?.[1] ?? null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      // A real UA avoids YouTube serving a stripped-down page
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load YouTube page (status ${res.status}).`);
  }

  const html = await res.text();

const match = html.match(/"captions":\s*({[\s\S]*?"captionTracks"[\s\S]*?})\s*,\s*"videoDetails"/)
  ?? html.match(/"captions":\s*({[\s\S]*?"captionTracks"[\s\S]*?}])\s*}/);

  if (!match) {
    throw new Error(
      "This video has no captions/subtitles available (either disabled by the uploader or auto-captions weren't generated)."
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    throw new Error("Could not parse caption metadata for this video.");
  }

  const tracks: CaptionTrack[] =
    parsed?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (!tracks.length) {
    throw new Error(
      "This video has no captions/subtitles available (either disabled by the uploader or auto-captions weren't generated)."
    );
  }

  return tracks;
}

function pickBestTrack(tracks: CaptionTrack[]): CaptionTrack {
  // Prefer manually-created English, then any English, then auto-generated
  // English, then just the first available track.
  return (
    tracks.find((t) => t.languageCode.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode.startsWith("en")) ??
    tracks[0]
  );
}

async function fetchTimedText(track: CaptionTrack): Promise<{ start: number; end: number; text: string }[]> {
  const res = await fetch(track.baseUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch caption track (status ${res.status}).`);
  }
  const xml = await res.text();

  const cueRegex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  const cues: { start: number; end: number; text: string }[] = [];

  let m: RegExpExecArray | null;
  while ((m = cueRegex.exec(xml)) !== null) {
    const start = parseFloat(m[1]);
    const dur = parseFloat(m[2]);
    const text = decodeEntities(m[3].replace(/<[^>]+>/g, "")).trim();
    if (text) {
      cues.push({ start, end: start + dur, text });
    }
  }

  return cues;
}

export async function extractYoutube(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL.");
  }

  try {
    const tracks = await getCaptionTracks(videoId);
    const track = pickBestTrack(tracks);
    const cues = await fetchTimedText(track);

    if (!cues.length) {
      throw new Error("Caption track was empty for this video.");
    }

    return cues
      .map((c) => `[[T:${c.start.toFixed(2)}:${c.end.toFixed(2)}]] ${c.text}`)
      .join("\n")
      .trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching YouTube transcript:", message);
    // Re-throw the specific message instead of the old generic one, so the
    // SourceItem tooltip in the UI shows the user something actionable.
    throw new Error(message);
  }
}