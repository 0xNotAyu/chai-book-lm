"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SourceViewerPanel, type CitedSource } from "@/components/notebook/workspace/SourceViewPanel";

interface ChatWorkspaceProps {
  hasSources: boolean;
  sourceCount: number;
}

export function ChatWorkspace({ hasSources, sourceCount }: ChatWorkspaceProps) {
  const [selectedSource, setSelectedSource] = useState<CitedSource | null>(null);

  return (
    <>
      {/* Chat Panel */}
      <main className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden min-w-0">
        <div className="h-14 px-5 flex items-center shrink-0">
          <h2 className="font-medium text-base text-zinc-200">Chat</h2>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto px-6 min-h-0">
          {!hasSources ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center">
              <p className="text-sm text-zinc-500">
                Add a source from the panel on the left to start chatting.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-6 pt-6">
              <div className="text-center text-zinc-500 mt-20 text-sm">
                Chat conversation active...
                {/*
                  When rendering citations in a message, each citation chip
                  should call: setSelectedSource({ sourceId, sourceType, title, snippet, page/timestampSeconds/url })
                */}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto relative h-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center pl-5 pr-2 gap-3">
            <Input
              type="text"
              placeholder="Start typing..."
              className="flex-1 bg-transparent border-0 shadow-none text-sm placeholder:text-zinc-600 focus-visible:ring-0 px-0 h-full"
            />
            <span className="text-xs text-zinc-600 shrink-0">{sourceCount} sources</span>
            <Button
              size="icon"
              className="rounded-full h-10 w-10 shrink-0 bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-100 disabled:bg-zinc-800"
              aria-label="Send message"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Citation panel — only renders when a citation is clicked */}
      <SourceViewerPanel selectedSource={selectedSource} onClose={() => setSelectedSource(null)} />
    </>
  );
}