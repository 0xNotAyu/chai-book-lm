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