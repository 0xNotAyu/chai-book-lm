"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X, RotateCw, Share2, Check } from "lucide-react";
import { ReportView } from "@/components/notebook/workspace/artifacts/ReportView";
import { FlashcardsView } from "@/components/notebook/workspace/artifacts/FlashcardsView";
import { QuizView } from "@/components/notebook/workspace/artifacts/QuizView";

type ArtifactType = "report" | "flashcards" | "quiz";

interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  status: "generating" | "completed" | "failed";
  errorMessage?: string | null;
  content: any;
  createdAt: string;
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

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // give up waiting after 3 minutes
const STALE_MS = 5 * 60 * 1000; // a "generating" row older than this is treated as dead

export function ArtifactPanel({ notebookId, type, onClose }: ArtifactPanelProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null); // artifact being generated
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false); // POST in flight
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const loadedFor = useRef<ArtifactType | null>(null);

  useEffect(() => {
    // Guard against React strict mode running this twice and queueing two jobs
    if (loadedFor.current === type) return;
    loadedFor.current = type;
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Poll while a job is running
  useEffect(() => {
    if (!pendingId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const tick = async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/artifacts`);
        const list: Artifact[] = await res.json();
        const found = Array.isArray(list) ? list.find((a) => a.id === pendingId) : undefined;
        if (cancelled) return;

        if (found?.status === "completed") {
          setArtifact(found);
          setPendingId(null);
          return;
        }
        if (found?.status === "failed") {
          setError(found.errorMessage || "Generation failed");
          setPendingId(null);
          return;
        }
        if (!found) {
          setError("This item no longer exists.");
          setPendingId(null);
          return;
        }
      } catch (err) {
        console.error("Polling failed:", err); // transient; try again below
      }

      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setError("This is taking longer than expected. Try again.");
        setPendingId(null);
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pendingId, notebookId]);

  async function loadExisting() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/artifacts`);
      const list: Artifact[] = await res.json();
      if (!res.ok || !Array.isArray(list)) throw new Error("Failed to load");

      const ofType = list.filter((a) => a.type === type); // list is newest-first
      const completed = ofType.find((a) => a.status === "completed");
      const inFlight = ofType.find(
        (a) =>
          a.status === "generating" &&
          Date.now() - new Date(a.createdAt).getTime() < STALE_MS
      );

      if (completed) setArtifact(completed);

      if (inFlight) {
        // Panel was closed and reopened mid-generation: resume instead of queueing another job
        setPendingId(inFlight.id);
        setIsLoading(false);
      } else if (completed) {
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
    setIsRequesting(true);
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
      setPendingId(data.id); // job queued; the polling effect takes over
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsRequesting(false);
      setIsLoading(false);
    }
  }

  async function handleShare() {
    if (!artifact) return;
    const url = `${window.location.origin}/share/${artifact.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const generating = isRequesting || pendingId !== null;
  const busy = isLoading || generating;

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
              <RotateCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
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
              {error && <p className="mb-4 text-xs text-red-400">{error}</p>}
              {generating && (
                <p className="mb-4 text-xs text-zinc-500">Generating a fresh version...</p>
              )}
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