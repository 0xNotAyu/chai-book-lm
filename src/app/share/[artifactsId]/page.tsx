import { notFound } from "next/navigation";
import { artifactService } from "@/services/artifact.service";
import { ReportView } from "@/components/notebook/workspace/artifacts/ReportView";
import { FlashcardsView } from "@/components/notebook/workspace/artifacts/FlashcardsView";
import { QuizView } from "@/components/notebook/workspace/artifacts/QuizView";

interface SharePageProps {
  params: Promise<{ artifactId: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { artifactId } = await params;

  const artifactDoc = await artifactService.getById(artifactId).catch(() => null);

  if (!artifactDoc || artifactDoc.status !== "completed") {
    notFound();
  }

  const artifact = JSON.parse(JSON.stringify(artifactDoc));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="h-16 px-6 flex items-center justify-between border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📙</span>
          <span className="font-medium text-zinc-200">{artifact.title}</span>
        </div>
        <span className="text-xs text-zinc-600 capitalize">{artifact.type} · Shared view</span>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {artifact.type === "report" && <ReportView content={artifact.content} />}
          {artifact.type === "flashcards" && <FlashcardsView content={artifact.content} />}
          {artifact.type === "quiz" && <QuizView content={artifact.content} />}
        </div>
      </main>

      <footer className="text-center py-3 text-[11px] text-zinc-600 border-t border-zinc-900 shrink-0">
        Generated with ChaibookLM — sip chai and relax.
      </footer>
    </div>
  );
}