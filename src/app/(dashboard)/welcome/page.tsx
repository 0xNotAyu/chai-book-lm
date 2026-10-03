
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChaiBookLM – Chat with your sources, with citations",
  description:
    "An AI research assistant. Upload PDFs, websites, YouTube videos and transcripts, then ask questions grounded in your own material.",
};

const TRY_HREF = "/?start=1";

const ingest = [
  { t: "Upload", d: "PDF, TXT, website URL, YouTube link or VTT transcript." },
  {
    t: "Extract",
    d: "Text is pulled out per source type, keeping page numbers and timestamps.",
  },
  {
    t: "Chunk",
    d: "Text is split into overlapping chunks that carry their citation metadata.",
  },
  { t: "Embed", d: "Each chunk becomes an OpenAI embedding vector." },
  {
    t: "Store",
    d: "Vectors go into Qdrant, filtered by notebook so nothing leaks between them.",
  },
  {
    t: "Ready",
    d: "The source switches from Indexing to Ready and can be searched.",
  },
];

const rag = [
  {
    t: "Rewrite the question",
    d: "One question becomes several: a typo-fixed rewrite, a broader step-back question, a HyDE hypothetical answer, and smaller sub-questions.",
  },
  {
    t: "Search in parallel",
    d: "Every variant is embedded and searched against Qdrant at the same time, limited to the current notebook.",
  },
  {
    t: "Fuse with RRF",
    d: "Reciprocal Rank Fusion merges the result lists. Chunks that rank well across many variants rise to the top.",
  },
  {
    t: "Answer from context only",
    d: "The top chunks go to the model with instructions to answer from them alone, streamed token by token.",
  },
  {
    t: "Attach citations",
    d: "Each answer links to the exact page, timestamp, transcript line or excerpt it came from.",
  },
];

const variants = [
  {
    n: "Rewrite",
    e: "“how does chuking work” → “How does text chunking work?”",
  },
  {
    n: "Step-back",
    e: "“What are the general principles of splitting documents?”",
  },
  {
    n: "HyDE",
    e: "A short imagined answer, embedded to find real passages that read like it.",
  },
  {
    n: "Sub-questions",
    e: "“What is chunk overlap?”, “How big should a chunk be?”",
  },
];

const stack = [
  ["Next.js 16 + React 19", "App Router, route handlers, streaming responses"],
  [
    "Inngest",
    "Background jobs that index sources, with steps and retries",
  ],
  ["Prisma + Neon Postgres", "Notebooks, sources, messages, artifacts"],
  ["Qdrant", "Vector search with a per-notebook filter"],
  ["OpenAI", "Embeddings, query rewriting, streamed chat"],
  ["Cloudinary", "Stores the original uploaded files"],
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-lg font-semibold tracking-tight">
          🍵 ChaiBookLM
        </span>

        {/* <Link
          href={TRY_HREF}
          className="rounded-full bg-[#E8A33D] px-5 py-2 text-sm font-medium text-[#1d1608] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A33D]"
        >
          Try it now
        </Link> */}
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-16 sm:pt-24">
          <div className="flex items-center gap-8 sm:gap-12">

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Ask your documents anything. Check every answer.
            </h1>
          </div>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Add PDFs, web pages, YouTube videos and transcripts to a notebook.
            Chat with them, and every reply points back to the page or timestamp
            it came from. You can also turn a notebook into a report,
            flashcards or a quiz and share it with a link.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href={TRY_HREF}
              className="rounded-full bg-[#E8A33D] px-7 py-3 text-base font-semibold text-[#1d1608] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A33D]"
            >
              Try ChaiBookLM
            </Link>

            <a
              href="#how"
              className="text-sm font-medium underline underline-offset-4"
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
           No sign-up. This is a demo project with temporary users created automatically based on your IP address.

          </p>
        </section>

        {/* Ingestion Pipeline */}
        <section
          id="how"
          className="border-t border-border bg-muted/40"
        >
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight">
              What happens when you add a source
            </h2>

            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              Indexing runs in the background as an Inngest function. Each
              stage is its own step, so a failure is retried from that step
              instead of starting over. The source shows Uploading, Indexing,
              Ready or Failed with a readable reason.
            </p>

            {/* Pipeline */}
            <div className="mt-12 overflow-x-auto pb-4">
              <div className="flex min-w-[850px] items-start">
                {ingest.map((s, i) => (
                  <div
                    key={s.t}
                    className="flex flex-1 items-start"
                  >
                    <div className="w-full">
                      <div className="flex items-center">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                            i === ingest.length - 1
                              ? "border-[#E8A33D] bg-[#E8A33D] text-[#1d1608]"
                              : "border-border bg-background"
                          }`}
                        >
                          <span className="text-xs font-medium tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>

                        {i < ingest.length - 1 && (
                          <div className="h-px flex-1 bg-border" />
                        )}
                      </div>

                      <div className="mt-4 pr-5">
                        <h3 className="font-semibold">{s.t}</h3>

                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {s.d}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Re-indexing reuses the text already extracted, so a source never
              needs to be uploaded twice.
            </p>
          </div>
        </section>

        {/* Advanced RAG */}
        <section className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">
            How a question becomes an answer
          </h2>

          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            A single search on the raw question misses a lot. People make
            typos, ask vaguely, or use different words than the document. So
            the question is expanded first, and the results are merged
            afterwards.
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            {/* RAG Pipeline */}
            <div>
              <ol className="relative ml-4 border-l border-border">
                {rag.map((s, i) => (
                  <li
                    key={s.t}
                    className="relative pb-9 pl-8 last:pb-0"
                  >
                    <span
                      className={`absolute -left-[15px] top-0 flex h-7 w-7 items-center justify-center rounded-full border ${
                        i === rag.length - 1
                          ? "border-[#E8A33D] bg-[#E8A33D] text-[#1d1608]"
                          : "border-border bg-background"
                      }`}
                    >
                      {i + 1}
                    </span>

                    <h3 className="font-semibold">{s.t}</h3>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {s.d}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Supporting details */}
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold">
                  The four query variants
                </h3>

                <dl className="mt-4 divide-y divide-border border-y border-border">
                  {variants.map((v) => (
                    <div
                      key={v.n}
                      className="grid gap-1 py-4 sm:grid-cols-[110px_1fr]"
                    >
                      <dt className="font-medium">{v.n}</dt>

                      <dd className="text-sm leading-relaxed text-muted-foreground">
                        {v.e}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h3 className="font-semibold">
                  Reciprocal Rank Fusion
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Each chunk scores the sum of 1 / (k + rank) over every list
                  it appears in. A chunk found by three variants beats one
                  found by a single variant, even if that one ranked first.
                </p>

                <pre className="mt-4 overflow-x-auto border-y border-border py-3 text-sm text-muted-foreground">
                  score(chunk) = Σ 1 / (k + rank)
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Stack */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight">
              Built with
            </h2>

            <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {stack.map(([n, d]) => (
                <div
                  key={n}
                  className="border-b border-border pb-4"
                >
                  <dt className="font-semibold">{n}</dt>

                  <dd className="text-sm text-muted-foreground">
                    {d}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-5 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ask it something.
          </h2>

          <Link
            href={TRY_HREF}
            className="mt-8 inline-block rounded-full bg-[#E8A33D] px-8 py-3.5 text-base font-semibold text-[#1d1608] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A33D]"
          >
            Try ChaiBookLM
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        ChaiBookLM · 0xNotAyu
      </footer>
    </div>
  );
}
