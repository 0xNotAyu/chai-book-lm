"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SourceViewerPanel, type CitedSource } from "@/components/notebook/workspace/SourceViewPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RefreshCw, MoreHorizontal } from "lucide-react";

interface ChatWorkspaceProps {
  notebookId: string;
  hasSources: boolean;
  sourceCount: number;
}

interface Citation {
  index: number;
  sourceId: string;
  sourceType: CitedSource["sourceType"];
  title: string;
  snippet: string;
  url: string | null;
  page: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function ChatWorkspace({ notebookId, hasSources, sourceCount }: ChatWorkspaceProps) {
  const [selectedSource, setSelectedSource] = useState<CitedSource | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persisted conversation history on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/chat`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setMessages(
            data.map((m: any) => ({ role: m.role, content: m.content }))
          );
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function handleSend() {
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    // Optimistically add the user message + a placeholder assistant message.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep last partial line for next chunk

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "token") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: last.content + event.content };
              return next;
            });
          } else if (event.type === "citations") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, citations: event.sources };
              return next;
            });
          } else if (event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = {
                ...last,
                content: last.content || `⚠️ ${event.message}`,
              };
              return next;
            });
          }
        }
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "⚠️ Something went wrong generating this answer.",
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function openCitation(c: Citation) {
    setSelectedSource({
      sourceId: c.sourceId,
      sourceType: c.sourceType,
      title: c.title,
      snippet: c.snippet,
      page: c.page ?? undefined,
      timestampSeconds: c.startSeconds ?? undefined,
      url: c.url ?? undefined,
    });
  }

  return (
    <>
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
          ) : isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center">
              <p className="text-sm text-zinc-500">
                Ask a question grounded in your {sourceCount} source{sourceCount === 1 ? "" : "s"}.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-6 py-6">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onCitationClick={openCitation} />
              ))}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking...
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto relative h-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center pl-5 pr-2 gap-3">
            <Input
              type="text"
              placeholder="Start typing..."
              value={input}
              disabled={!hasSources || isStreaming}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent border-0 shadow-none text-sm placeholder:text-zinc-600 focus-visible:ring-0 px-0 h-full"
            />
            <span className="text-xs text-zinc-600 shrink-0">{sourceCount} sources</span>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!hasSources || !input.trim() || isStreaming}
              className="rounded-full h-10 w-10 shrink-0 bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-100 disabled:bg-zinc-800"
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </main>

      <SourceViewerPanel selectedSource={selectedSource} onClose={() => setSelectedSource(null)} />
    </>
  );
}



// Converts [n] markers into markdown link syntax so ReactMarkdown parses
// them as nodes we can intercept and render as citation chips.
function citationsToMarkdownLinks(content: string, citations?: Citation[]): string {
  if (!citations || citations.length === 0) return content;
  return content.replace(/\[(\d+)\]/g, (match, num) => {
    const exists = citations.some((c) => c.index === Number(num));
    return exists ? `[${num}](citation:${num})` : match;
  });
}

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: ChatMessage;
  onCitationClick: (c: Citation) => void;
}) {
  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-zinc-800 text-zinc-100 px-4 py-2.5 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full">
        <div className="prose prose-invert prose-sm max-w-none text-zinc-200 leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-zinc-200">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-semibold text-zinc-100 mt-4 mb-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold text-zinc-100 mt-4 mb-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-100 mt-3 mb-1.5 first:mt-0">{children}</h3>,
              strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 text-xs font-mono">
                  {children}
                </code>
              ),
              a: ({ href, children }) => {
                if (href?.startsWith("citation:")) {
                  const idx = Number(href.replace("citation:", ""));
                  const citation = message.citations?.find((c) => c.index === idx);
                  if (citation) {
                    return (
                      <button
                        onClick={() => onCitationClick(citation)}
                        className="inline-flex items-center justify-center mx-0.5 h-4 min-w-4 px-1 rounded-full bg-zinc-700 text-zinc-200 text-[10px] font-medium align-super hover:bg-zinc-600 transition-colors"
                      >
                        {idx}
                      </button>
                    );
                  }
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                    {children}
                  </a>
                );
              },
            }}
          >
            {citationsToMarkdownLinks(message.content, message.citations)}
          </ReactMarkdown>
        </div>

        {/* Placeholder action row — wire up real behavior later */}
        {message.content && (
          <div className="flex items-center gap-1 mt-1 -ml-1.5">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Copy response"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Regenerate response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

