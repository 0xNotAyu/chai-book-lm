"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ReportView({ content }: { content: { markdown: string } }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-zinc-200 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-100 mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
        }}
      >
        {content.markdown}
      </ReactMarkdown>
    </div>
  );
}