// src/lib/chunker.ts
//
// Simple, dependency-free chunking. No langchain/text-splitter package —
// just fixed-size word windows with overlap, applied per "segment" so each
// chunk keeps accurate location metadata:
//   - pdf: chunked within each page (from [[PAGE:n]] markers), so every
//     chunk maps to exactly one page.
//   - youtube / vtt: cues are merged into ~40s windows (from [[T:start:end]]
//     markers) so every chunk maps to a start/end timestamp.
//   - website / text: no location markers, just fixed-size windows.

export type ChunkableSourceType = "pdf" | "youtube" | "website" | "text" | "vtt";

export interface RawChunk {
  text: string;
  chunkIndex: number;
  page?: number;
  startSeconds?: number;
  endSeconds?: number;
}

const WORDS_PER_CHUNK = 220; // ~ roughly 300-400 tokens, comfortable for retrieval
const WORD_OVERLAP = 40;
const TIME_WINDOW_SECONDS = 40; // merge youtube/vtt cues into ~40s windows
const TIME_WINDOW_MAX_CHARS = 900;

function splitWords(text: string, size: number, overlap: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= size) return [words.join(" ")];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + size, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }
  return chunks;
}

// --- PDF: text carries [[PAGE:n]] markers, one per page ---
function chunkPdfText(rawText: string): RawChunk[] {
  const pageRegex = /\[\[PAGE:(\d+)\]\]/g;
  const matches = [...rawText.matchAll(pageRegex)];
  const pages: { page: number; text: string }[] = [];

  if (matches.length === 0) {
    pages.push({ page: 1, text: rawText });
  } else {
    for (let i = 0; i < matches.length; i++) {
      const page = parseInt(matches[i][1], 10);
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : rawText.length;
      pages.push({ page, text: rawText.slice(start, end).trim() });
    }
  }

  const chunks: RawChunk[] = [];
  let chunkIndex = 0;
  for (const { page, text } of pages) {
    if (!text) continue;
    for (const piece of splitWords(text, WORDS_PER_CHUNK, WORD_OVERLAP)) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      chunks.push({ text: trimmed, chunkIndex: chunkIndex++, page });
    }
  }
  return chunks;
}

// --- YouTube / VTT: text carries [[T:start:end]] markers, one per cue ---
function chunkTimedText(rawText: string): RawChunk[] {
  const cueRegex = /\[\[T:([\d.]+):([\d.]+)\]\]\s*([^\n]*)/g;
  const cues: { start: number; end: number; text: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = cueRegex.exec(rawText)) !== null) {
    const text = match[3].trim();
    if (text) {
      cues.push({ start: parseFloat(match[1]), end: parseFloat(match[2]), text });
    }
  }

  if (cues.length === 0) {
    // Markers missing for some reason — fall back to plain chunking, no timestamps
    return splitWords(rawText, WORDS_PER_CHUNK, WORD_OVERLAP).map((t, i) => ({
      text: t.trim(),
      chunkIndex: i,
    }));
  }

  const chunks: RawChunk[] = [];
  let chunkIndex = 0;
  let bucket: typeof cues = [];
  let bucketStart = cues[0].start;
  let charCount = 0;

  const flush = () => {
    if (bucket.length === 0) return;
    const text = bucket.map((c) => c.text).join(" ").trim();
    if (text) {
      chunks.push({
        text,
        chunkIndex: chunkIndex++,
        startSeconds: bucket[0].start,
        endSeconds: bucket[bucket.length - 1].end,
      });
    }
    bucket = [];
    charCount = 0;
  };

  for (const cue of cues) {
    const wouldExceedTime = cue.end - bucketStart > TIME_WINDOW_SECONDS;
    const wouldExceedChars = charCount + cue.text.length > TIME_WINDOW_MAX_CHARS;

    if (bucket.length > 0 && (wouldExceedTime || wouldExceedChars)) {
      flush();
      bucketStart = cue.start;
    }

    bucket.push(cue);
    charCount += cue.text.length;
  }
  flush();

  return chunks;
}

// --- Website / plain text: no markers, just windowed chunks ---
function chunkPlainText(rawText: string): RawChunk[] {
  return splitWords(rawText, WORDS_PER_CHUNK, WORD_OVERLAP).map((t, i) => ({
    text: t.trim(),
    chunkIndex: i,
  }));
}

export function chunkExtractedText(rawText: string, sourceType: ChunkableSourceType): RawChunk[] {
  const cleaned = rawText.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  switch (sourceType) {
    case "pdf":
      return chunkPdfText(cleaned);
    case "youtube":
    case "vtt":
      return chunkTimedText(cleaned);
    case "website":
    case "text":
    default:
      return chunkPlainText(cleaned);
  }
}
