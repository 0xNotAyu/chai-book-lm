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

interface ClientConfig {
  name: string;
  apiKey: string;
  context: Record<string, unknown>;
}

const CLIENT_CONFIGS: ClientConfig[] = [
  {
    name: "ANDROID",
    apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 30,
      },
    },
  },
  {
    name: "IOS",
    apiKey: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.09.3",
        deviceModel: "iPhone14,3",
      },
    },
  },
  {
    name: "WEB",
    apiKey: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    context: {
      client: { clientName: "WEB", clientVersion: "2.20240401.01.00" },
    },
  },
];

async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  let lastError = "";

  for (const config of CLIENT_CONFIGS) {
    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${config.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              config.name === "ANDROID"
                ? "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip"
                : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({
            videoId,
            context: config.context,
          }),
        }
      );

      if (!res.ok) {
        lastError = `${config.name}: HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();
      const status = data?.playabilityStatus?.status;
      const tracks: CaptionTrack[] =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

      console.log(`[youtube debug] client=${config.name} status=${status} tracks=${tracks.length}`);

      if (tracks.length > 0) {
        return tracks;
      }

      lastError = `${config.name}: status=${status}, no caption tracks`;
    } catch (err) {
      lastError = `${config.name}: ${err instanceof Error ? err.message : "unknown error"}`;
    }
  }

  throw new Error(
    `This video has no captions/subtitles available, or YouTube is blocking automated access from this server (last attempt: ${lastError}).`
  );
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