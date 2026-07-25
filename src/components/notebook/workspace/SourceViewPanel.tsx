// src/components/notebook/workspace/SourceViewerPanel.tsx
"use client";

import { X, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Types you'll likely plug in once citations exist.
 * Adjust field names to match your actual RAG/source schema.
 */
export type CitedSource = {
  sourceId: string;
  sourceType: "pdf" | "text" | "website" | "youtube" | "vtt";
  title: string;
  /** The exact chunk/snippet the answer was grounded in */
  snippet: string;
  /** PDF: page number */
  page?: number;
  /** YouTube: seconds to seek to */
  timestampSeconds?: number;
  /** Website: URL to open/preview */
  url?: string;
};

interface SourceViewerPanelProps {
  /** Panel only renders when this is non-null. */
  selectedSource: CitedSource | null;
  /** Called when the user clicks the X to dismiss the panel */
  onClose: () => void;
}

/**
 * Appears only when a citation is clicked in chat. No collapse/expand state,
 * no floating card styling — just a plain panel that shows up and can be
 * dismissed with the X. Wire it up like:
 *
 *   const [selectedSource, setSelectedSource] = useState<CitedSource | null>(null);
 *   <SourceViewerPanel selectedSource={selectedSource} onClose={() => setSelectedSource(null)} />
 *   // on citation click: setSelectedSource(citation)
 */
export function SourceViewerPanel({ selectedSource, onClose }: SourceViewerPanelProps) {
  if (!selectedSource) return null;

  return (
    <aside className="w-[380px] shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden">
      <div className="h-14 px-5 flex items-center justify-between shrink-0 border-b border-zinc-800">
        <h2 className="font-medium text-base text-zinc-200">Source</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Close source viewer"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
              {selectedSource.sourceType}
            </p>
            <h3 className="text-sm font-medium text-zinc-100">
              {selectedSource.title}
            </h3>
            {selectedSource.page != null && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Page {selectedSource.page}
              </p>
            )}
            {selectedSource.timestampSeconds != null && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Starts at {formatTimestamp(selectedSource.timestampSeconds)}
              </p>
            )}
          </div>

          {/*
            Render logic per source type goes here once wired up:
            - pdf: embed viewer, scroll/highlight to `page`
            - youtube: iframe with `?start=${timestampSeconds}`
            - website: iframe preview or fetched readable content
            - text / vtt: render full text with `snippet` highlighted
          */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {selectedSource.snippet}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}