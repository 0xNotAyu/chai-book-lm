"use client";

import { useEffect, useRef, useState } from "react";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type CitedSource = {
  sourceId: string;
  sourceType: "pdf" | "text" | "website" | "youtube" | "vtt";
  title: string;
  snippet: string;
  page?: number;
  timestampSeconds?: number;
  url?: string;
  fileUrl?: string;
};

function getYoutubeEmbedUrl(url: string, startSeconds?: number) {
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  const videoId = match?.[1];
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?start=${startSeconds ? Math.floor(startSeconds) : 0}&autoplay=1`;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function VttViewer({ source }: { source: CitedSource }) {
  const [cues, setCues] = useState<{ start: number; end: number; text: string }[] | null>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCues(null);

    fetch(`/api/sources/${source.sourceId}/content`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const regex = /\[\[T:([\d.]+):([\d.]+)\]\]\s*([^\n]*)/g;
        const parsed: { start: number; end: number; text: string }[] = [];
        let m;
        while ((m = regex.exec(data.extractedText || "")) !== null) {
          parsed.push({ start: parseFloat(m[1]), end: parseFloat(m[2]), text: m[3].trim() });
        }
        setCues(parsed);
      })
      .catch(() => {
        if (!cancelled) setCues([]);
      });

    return () => {
      cancelled = true;
    };
  }, [source.sourceId]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [cues, source.timestampSeconds]);

  if (cues === null) {
    return <p className="text-zinc-500 text-sm mt-16 text-center">Loading transcript...</p>;
  }

  if (cues.length === 0) {
    return <p className="text-zinc-500 text-sm mt-16 text-center">No transcript content available.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      {cues.map((cue, i) => {
        const isActive =
          source.timestampSeconds != null &&
          source.timestampSeconds >= cue.start &&
          source.timestampSeconds <= cue.end + 2;

        return (
          <div
            key={i}
            ref={isActive ? activeRef : undefined}
            className={`flex gap-3 py-1.5 px-2 rounded-lg ${
              isActive ? "bg-blue-500/15 border border-blue-600/40" : ""
            }`}
          >
            <span className="text-xs text-zinc-500 shrink-0 font-mono pt-0.5">
              {formatTime(cue.start)}
            </span>
            <p className={`text-sm leading-relaxed ${isActive ? "text-blue-400" : "text-zinc-300"}`}>
              {cue.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function SourceContent({ source, scale = 1 }: { source: CitedSource; scale?: number }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setNumPages(null);
  }, [source.sourceId]);

  useEffect(() => {
    if (!source.page || !numPages) return;
    pageRefs.current[source.page]?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
  }, [numPages, source.page, source.sourceId]);

  const { sourceType, snippet, timestampSeconds, url, fileUrl } = source;

  if (sourceType === "pdf" && fileUrl) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-zinc-900">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="text-zinc-500 text-sm mt-16 text-center">Loading PDF...</p>}
          error={<p className="text-red-400 text-sm mt-16 text-center">Failed to load PDF.</p>}
        >
          {Array.from({ length: numPages ?? 0 }, (_, i) => i + 1).map((n) => (
            <div key={n} ref={(el) => { pageRefs.current[n] = el; }} className="flex justify-center py-2">
              <Page pageNumber={n} scale={scale} renderAnnotationLayer={false} renderTextLayer={false} />
            </div>
          ))}
        </Document>
      </div>
    );
  }

  if (sourceType === "youtube" && url && getYoutubeEmbedUrl(url, timestampSeconds)) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <iframe key={url + timestampSeconds} src={getYoutubeEmbedUrl(url, timestampSeconds)!} className="w-full max-w-5xl aspect-video" allow="autoplay; encrypted-media" allowFullScreen />
      </div>
    );
  }
  if (sourceType === "vtt") {
    return <VttViewer source={source} />;
  }


  if (sourceType === "website" && url) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-center rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900">
          Open Original Site ↗
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto">
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{snippet}</p>
    </div>
  );
}