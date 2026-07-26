"use client";

import { useState } from "react";
import { FileText, Layers, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtifactPanel } from "@/components/notebook/workspace/ArtifactPanel";

type ArtifactType = "report" | "flashcards" | "quiz";

interface StudioBarProps {
  notebookId: string;
  hasSources: boolean;
}

const BUTTONS: { type: ArtifactType; label: string; icon: React.ReactNode }[] = [
  { type: "report", label: "Report", icon: <FileText className="w-4 h-4" /> },
  { type: "flashcards", label: "Flashcards", icon: <Layers className="w-4 h-4" /> },
  { type: "quiz", label: "Quiz", icon: <HelpCircle className="w-4 h-4" /> },
];

export function StudioBar({ notebookId, hasSources }: StudioBarProps) {
  const [activeType, setActiveType] = useState<ArtifactType | null>(null);

  return (
    <>
      <div className="flex items-center gap-1.5">
        {BUTTONS.map((b) => (
          <Button
            key={b.type}
            variant="ghost"
            disabled={!hasSources}
            onClick={() => setActiveType(b.type)}
            className="rounded-full h-9 px-4 gap-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
          >
            {b.icon}
            {b.label}
          </Button>
        ))}
      </div>

      {activeType && (
        <ArtifactPanel
          notebookId={notebookId}
          type={activeType}
          onClose={() => setActiveType(null)}
        />
      )}
    </>
  );
}