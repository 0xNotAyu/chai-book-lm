// src/app/notebook/[id]/page.tsx
import { Plus, FileText, PanelLeftClose, TrendingUp } from "lucide-react";
import { SourceList } from "@/components/notebook/workspace/SourceList";
import { ChatWorkspace } from "@/components/notebook/workspace/ChatWorkspace";
import { UniversalSourceArea } from "@/components/notebook/workspace/UniversalSourceArea";
import { sourceService } from "@/services/source.services";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotebookPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NotebookPage({ params }: NotebookPageProps) {
  const { id } = await params;

  const rawSources = await sourceService.getSourcesByNotebookId(id);
  const sources = JSON.parse(JSON.stringify(rawSources));
  const hasSources = sources.length > 0;

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Global Header */}
      <header className="h-16 flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          📙
          <span className="text-lg font-medium text-zinc-200">Untitled notebook</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="rounded-full h-9 px-4 gap-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <TrendingUp className="w-4 h-4" />
            Share
          </Button>
        </div>
      </header>

      {/* Workspace Container */}
      <div className="flex-1 flex gap-4 overflow-hidden px-4 pb-1 min-h-0">
        {/* Sources Panel */}
        <aside className="w-[300px] shrink-0 bg-zinc-900/60 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
          <div className="h-14 px-5 flex items-center justify-between shrink-0">
            <h2 className="font-medium text-base text-zinc-200">Sources</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Collapse source panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 pb-3 flex flex-col gap-3">
            {/* The only entry point for adding a source */}
            <UniversalSourceArea
              notebookId={id}
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
                <SourceList sources={sources} notebookId={id} />
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat + citation panel — client component, they share selectedSource state */}
        <ChatWorkspace notebookId={id} hasSources={hasSources} sourceCount={sources.length} />
      </div>

      {/* Disclaimer Footer */}
      <footer className="text-center py-2 text-[11px] text-zinc-600 shrink-0">
        ChaiBookML doesn't make mistakes, so sip chai and relax.
      </footer>
    </div>
  );
}
