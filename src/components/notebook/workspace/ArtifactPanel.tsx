"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X, RotateCw, Share2, Check } from "lucide-react";
import { ReportView } from "@/components/notebook/workspace/artifacts/ReportView";
import { FlashcardsView } from "@/components/notebook/workspace/artifacts/FlashcardsView";
import { QuizView } from "@/components/notebook/workspace/artifacts/QuizView";

type ArtifactType = "report" | "flashcards" | "quiz";

interface Artifact {
  _id: string;
  type: ArtifactType;
  title: string;
  status: "generating" | "completed" | "failed";
  errorMessage?: string | null;
  content: any;
}

interface ArtifactPanelProps {
  notebookId: string;
  type: ArtifactType;
  onClose: () => void;
}

const TITLES: Record<ArtifactType, string> = {
  report: "Report",
  flashcards: "Flashcards",
  quiz: "Quiz",
};

export function ArtifactPanel({ notebookId, type, onClose }: ArtifactPanelProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function loadExisting() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/artifacts`);
      const list: Artifact[] = await res.json();
      const latest = list.find((a) => a.type === type && a.status === "completed");
      if (latest) {
        setArtifact(latest);
        setIsLoading(false);
      } else {
        await generate();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load. Try regenerating.");
      setIsLoading(false);
    }
  }

  async function generate() {
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Failed to generate ${TITLES[type].toLowerCase()}`);
      }
      setArtifact(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsRegenerating(false);
      setIsLoading(false);
    }
  }

  async function handleShare() {
    if (!artifact) return;
    const url = `${window.location.origin}/share/${artifact._id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const busy = isLoading || isRegenerating;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
        <div className="h-14 px-5 flex items-center justify-between shrink-0 border-b border-zinc-900">
          <h2 className="font-medium text-sm text-zinc-200">{TITLES[type]}</h2>

          <div className="flex items-center gap-1.5">
            <button
              onClick={generate}
              disabled={busy}
              title="Regenerate"
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleShare}
              disabled={!artifact || busy}
              title="Copy share link"
              className="h-8 px-3 flex items-center gap-1.5 rounded-full text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Share"}
            </button>

            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {busy && !artifact ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-sm">Generating {TITLES[type].toLowerCase()}...</p>
            </div>
          ) : error && !artifact ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={generate}
                className="h-9 px-4 rounded-full text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : artifact ? (
            <>
              {type === "report" && <ReportView content={artifact.content} />}
              {type === "flashcards" && <FlashcardsView content={artifact.content} />}
              {type === "quiz" && <QuizView content={artifact.content} />}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}