"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RefreshCw, MoreHorizontal } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy as CopyIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { createPortal } from "react-dom";
import { SourceContent, type CitedSource } from "@/components/notebook/workspace/SourceViewPanel";
import { X } from "lucide-react";

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
  fileUrl: string | null;
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
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [pdfScale, setPdfScale] = useState(1);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);

useEffect(() => {
  if (!hasSources || messages.length > 0 || isLoadingHistory) return;
  fetch(`/api/notebooks/${notebookId}/suggestions`)
    .then((r) => r.json())
    .then((d) => setSuggestions(d.questions ?? []))
    .catch(() => {});
}, [hasSources, messages.length, isLoadingHistory, notebookId]);

  // Cheap heuristic instead of measuring the DOM — avoids ref conflicts since
  // this component's `chatPanel` JSX is mounted twice at once (main view +
  // citation drawer) whenever a source is selected.
  const showExpandIcon = input.includes("\n") || input.length > 120;

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      setIsInputExpanded(false);
    }
  }

  async function handleClearChat() {
  if (!confirm("Clear this conversation? Your sources will stay.")) return;
  await fetch(`/api/notebooks/${notebookId}/chat`, { method: "DELETE" });
  setMessages([]);
}

  const chatPanel = (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto px-6 min-h-0">
        {!hasSources ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center">
            <p className="text-sm text-zinc-500">Add a source from the panel on the left to start chatting.</p>
          </div>
        ) : isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
  <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center gap-4">
    <p className="text-sm text-zinc-500">Ask a question grounded in your {sourceCount} source{sourceCount === 1 ? "" : "s"}.</p>
    {suggestions.length > 0 && (
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <p className="text-xs text-zinc-600">Not sure what to ask? Choose something:</p>
        {suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => setInput(q)}
            className="text-sm text-zinc-300 border border-zinc-800 rounded-full px-4 py-2 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    )}
  </div>
): (
          <div className="w-full flex-1 flex flex-col gap-6 py-6">
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

      <div className="px-6 pb-6 pt-2 shrink-0">
        <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900 focus-within:border-zinc-700 transition-colors">
          <Textarea
            placeholder="Start typing..."
            value={input}
            disabled={!hasSources || isStreaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            rows={1}
            className={`w-full bg-transparent border-0 shadow-none text-sm placeholder:text-zinc-600 focus-visible:ring-0 resize-none px-5 pt-4 pb-1.5 min-h-5 max-h-40 ${showExpandIcon ? "pr-11" : ""}`}
          />

          {showExpandIcon && !isStreaming && hasSources && (
            <button
              type="button"
              onClick={() => setIsInputExpanded(true)}
              title="Expand"
              className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-xs text-zinc-600">{sourceCount} source{sourceCount === 1 ? "" : "s"}</span>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!hasSources || !input.trim() || isStreaming}
              className="rounded-full h-9 w-9 shrink-0 bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-100 disabled:bg-zinc-800"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

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
            data.map((m: any) => ({ role: m.role, content: m.content, citations: m.citations }))
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

  // Autofocus the fullscreen editor when it opens; Escape collapses it back
  // into the pill without discarding whatever's been typed.
  useEffect(() => {
    if (isInputExpanded) {
      requestAnimationFrame(() => expandedTextareaRef.current?.focus());
    }
  }, [isInputExpanded]);

  useEffect(() => {
    if (!isInputExpanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsInputExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isInputExpanded]);

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
      fileUrl: c.fileUrl ?? undefined,
    });
  }

  return (
    <>
      <main className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden min-w-0">
        <div className="h-14 px-5 flex items-center justify-between shrink-0">
  <h2 className="font-medium text-base text-zinc-200">Chat</h2>
  {messages.length > 0 && (
    <button
      onClick={handleClearChat}
      className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
    >
      Clear chat
    </button>
  )}
</div>
        {chatPanel}
      </main>

      {selectedSource && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] bg-zinc-950 flex">
          {/* Collapsible chat drawer */}
          <div className={`relative shrink-0 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200 ${chatCollapsed ? "w-0" : "w-[360px]"}`}>
            {!chatCollapsed && (
              <>
                <div className="h-14 px-5 flex items-center justify-between shrink-0 border-b border-zinc-800">
                  <h2 className="font-medium text-sm text-zinc-200">Chat</h2>
                </div>
                {chatPanel}
              </>
            )}
          </div>

          {/* Collapse toggle tab */}
          <button
            onClick={() => setChatCollapsed((c) => !c)}
            className="absolute top-1/2 -translate-y-1/2 z-20 h-16 w-5 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-r-lg text-zinc-400 hover:text-white transition-all"
            style={{ left: chatCollapsed ? 0 : 360 }}
          >
            {chatCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Document viewport with its own top toolbar */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-12 px-4 flex items-center justify-between shrink-0 bg-zinc-900 border-b border-zinc-800">
              <span className="text-xs text-zinc-400 truncate max-w-xs">{selectedSource.title}</span>

              <div className="flex items-center gap-3">
                {selectedSource.sourceType === "pdf" && selectedSource.fileUrl && (
                  <div className="flex items-center gap-1 bg-zinc-800 rounded-full px-1 py-1">
                    <button onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.2))} className="p-1.5 rounded-full text-zinc-300 hover:bg-zinc-700 hover:text-white">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-medium text-white bg-zinc-800  rounded-full px-2 py-0.5 min-w-11 text-center">
                      {Math.round(pdfScale * 100)}%
                    </span>
                    <button onClick={() => setPdfScale((s) => Math.min(3, s + 0.2))} className="p-1.5 rounded-full text-zinc-300 hover:bg-zinc-700 hover:text-white">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button onClick={() => setSelectedSource(null)} className="h-7 w-7 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-zinc-950 flex flex-col">
              <SourceContent source={selectedSource} scale={pdfScale} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen question editor — Gemini-style expand. Sits above the
          citation drawer (z-[999]) so it works even while a source is open. */}
      {isInputExpanded && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="h-14 px-5 flex items-center justify-between shrink-0 border-b border-zinc-900">
            <span className="text-sm font-medium text-zinc-400">Editing your question</span>
            <button
              onClick={() => setIsInputExpanded(false)}
              title="Collapse"
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-0">
            <Textarea
              ref={expandedTextareaRef}
              placeholder="Start typing..."
              value={input}
              disabled={!hasSources || isStreaming}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              className="w-full h-full min-h-[55vh] max-w-3xl mx-auto bg-transparent border-0 shadow-none text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 resize-none px-0"
            />
          </div>

          <div className="px-6 pb-6 pt-2 shrink-0">
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                {sourceCount} source{sourceCount === 1 ? "" : "s"} · Enter to send · Shift+Enter for a new line
              </span>
              <Button
                size="icon"
                onClick={() => {
                  handleSend();
                  setIsInputExpanded(false);
                }}
                disabled={!hasSources || !input.trim() || isStreaming}
                className="rounded-full h-11 w-11 shrink-0 bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-100 disabled:bg-zinc-800"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
// Converts [n] markers into markdown link syntax so ReactMarkdown parses
// them as nodes we can intercept and render as citation chips.
function citationsToMarkdownLinks(content: string, citations?: Citation[]): string {
  if (!citations || citations.length === 0) return content;

  const parts = content.split(/(```[\s\S]*?```)/g); // keep fenced blocks untouched
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // odd index = inside a ``` fence, skip
      return part.replace(/\[(\d+)\]/g, (match, num) => {
        const exists = citations.some((c) => c.index === Number(num));
        return exists ? `[${num}](#citation-${num})` : match;
      });
    })
    .join("");
}
function splitCompleteAndPending(content: string) {
  const fenceCount = (content.match(/```/g) || []).length;
  if (fenceCount % 2 === 0) return { complete: content, pending: "" };
  const lastFenceIdx = content.lastIndexOf("```");
  return { complete: content.slice(0, lastFenceIdx), pending: content.slice(lastFenceIdx) };
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 text-xs text-zinc-400">
        <span>{language || "text"}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-zinc-200">
          {copied ? <Check className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, padding: "1rem" }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
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
        <div className="max-w-[80%] rounded-2xl bg-zinc-800 text-zinc-100 px-4 py-2.5 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  const { complete, pending } = splitCompleteAndPending(message.content);
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
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "");
                const value = String(children).replace(/\n$/, "");
                const isInline = !match && !value.includes("\n");

                if (isInline) {
                  return (
                    <code className="bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  );
                }

                return <CodeBlock language={match?.[1] || ""} value={value} />;
              },
              pre: ({ children }) => <>{children}</>,

              a: ({ href, children }) => {
                if (href?.startsWith("#citation-")) {
                  const idx = Number(href.replace("#citation-", ""));
                  const citation = message.citations?.find((c) => c.index === idx);
                  function formatTimestamp(totalSeconds: number) {
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
                    return `${minutes}:${seconds}`;
                  }
                  if (citation) {
                    if (citation.sourceType === "website" && citation.url) {
                      return (
                        <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs mx-0.5">
                          {new URL(citation.url).hostname}
                        </a>
                      );
                    }

                    if (citation.sourceType === "youtube" && citation.startSeconds != null) {
                      return (
                        <button
                          onClick={() => onCitationClick(citation)}
                          className="text-blue-400 font-medium hover:underline mx-0.5"
                        >
                          ({formatTimestamp(citation.startSeconds)})
                        </button>
                      );
                    }

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
            {citationsToMarkdownLinks(complete, message.citations)}
          </ReactMarkdown>
          {pending && (
            <pre className="text-zinc-400 text-xs whitespace-pre-wrap font-mono">{pending}</pre>
          )}
        </div>

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