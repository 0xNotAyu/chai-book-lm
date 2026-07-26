import { notFound } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import { ChatWorkspace } from "@/components/notebook/workspace/ChatWorkspace";
import { SourcesPanel } from "@/components/notebook/workspace/SourcesPanel";
import { StudioBar } from "@/components/notebook/workspace/StudioBar";
import { sourceService } from "@/services/source.services";
import { notebookService } from "@/services/notebook.service";
import { Button } from "@/components/ui/button";

interface NotebookPageProps {
  params: Promise<{ id: string }>;
}

export default async function NotebookPage({ params }: NotebookPageProps) {
  const { id } = await params;

  const [notebookDoc, rawSources] = await Promise.all([
    notebookService.getNotebookById(id).catch(() => null),
    sourceService.getSourcesByNotebookId(id),
  ]);

  if (!notebookDoc) {
    notFound();
  }

  const notebook = JSON.parse(JSON.stringify(notebookDoc));
  const sources = JSON.parse(JSON.stringify(rawSources));
  const hasSources = sources.length > 0;

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      <header className="h-16 flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span>{notebook.emoji || "📙"}</span>
          <span className="text-lg font-medium text-zinc-200">{notebook.title || "Untitled notebook"}</span>
        </div>

        <StudioBar notebookId={id} hasSources={hasSources} />
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden px-4 pb-1 min-h-0">
        <aside className="w-[300px] shrink-0 bg-zinc-900/60 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
          <div className="h-14 px-5 flex items-center justify-between shrink-0">
            <h2 className="font-medium text-base text-zinc-200">Sources</h2>
            
          </div>

          <SourcesPanel notebookId={id} initialSources={sources} />
        </aside>

        <ChatWorkspace notebookId={id} hasSources={hasSources} sourceCount={sources.length} />
      </div>

      <footer className="text-center py-2 text-[11px] text-zinc-600 shrink-0">
        ChaiBookML doesn't make mistakes, so sip chai and relax.
      </footer>
    </div>
  );
}