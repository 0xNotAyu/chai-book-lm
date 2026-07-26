"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UniversalSourceArea } from "@/components/notebook/workspace/UniversalSourceArea";
import { SourceList, type Source } from "@/components/notebook/workspace/SourceList";

interface SourcesPanelProps {
  notebookId: string;
  initialSources: Source[];
}

/**
 * Owns the live source list for the workspace sidebar. Adding a source no
 * longer blocks the dialog on extraction/indexing — the dialog closes the
 * instant the request is fired, an optimistic "processing" row appears in
 * the list immediately, and the list is reconciled with real data (status,
 * chunk count, errors) once the background request resolves.
 */
export function SourcesPanel({ notebookId, initialSources }: SourcesPanelProps) {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>(initialSources);

  // Keep in sync with fresh server data whenever a router.refresh() lands
  // (triggered after a source add/reindex/delete resolves).
  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  function handleOptimisticAdd(temp: Source) {
    setSources((prev) => [temp, ...prev]);
  }

  function handleResolved() {
    // Pulls authoritative data from the server (real _id, status, chunkCount,
    // or errorMessage on failure) and replaces the optimistic placeholder.
    router.refresh();
  }

  function handleSourceDeleted(sourceId: string) {
    // Remove immediately for a snappy UI, then refresh so sibling server
    // components (e.g. ChatWorkspace's hasSources/sourceCount) stay in sync.
    setSources((prev) => prev.filter((s) => s._id !== sourceId));
    router.refresh();
  }

  function handleSourceUpdated(updated: Source) {
    setSources((prev) => prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s)));
  }

  const hasSources = sources.length > 0;

  return (
    <>
      <div className="px-4 pb-3 flex flex-col gap-3">
        {/* The only entry point for adding a source */}
        <UniversalSourceArea
          notebookId={notebookId}
          onOptimisticAdd={handleOptimisticAdd}
          onResolved={handleResolved}
          trigger={
            <Button
              variant="outline"
              className="w-full rounded-full h-10 gap-1.5 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white bg-transparent"
            >
              <Plus className="w-4 h-4" />
              Add sources
            </Button>
          }
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-2 h-full flex flex-col">
          {!hasSources ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-10">
              <FileText className="w-6 h-6 text-zinc-600 mb-4" />
              <p className="font-medium text-sm text-zinc-200 mb-2">
                Saved sources will appear here
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                Add files, websites or more. Then ask questions or create things based on these sources.
              </p>
            </div>
          ) : (
            <SourceList
              sources={sources}
              notebookId={notebookId}
              onSourceDeleted={handleSourceDeleted}
              onSourceUpdated={handleSourceUpdated}
            />
          )}
        </div>
      </ScrollArea>
    </>
  );
}
