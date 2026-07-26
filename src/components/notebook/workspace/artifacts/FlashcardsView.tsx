"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

interface Card {
  front: string;
  back: string;
}

export function FlashcardsView({ content }: { content: { cards: Card[] } }) {
  const cards = content?.cards ?? [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <p className="text-sm text-zinc-500">No flashcards available.</p>;
  }

  const card = cards[index];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <span className="text-xs text-zinc-500">
        {index + 1} / {cards.length}
      </span>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-lg min-h-56 rounded-3xl border border-zinc-800 bg-zinc-900 flex items-center justify-center p-8 text-center hover:border-zinc-700 transition-colors"
      >
        <p className="text-base text-zinc-100 leading-relaxed">
          {flipped ? card.back : card.front}
        </p>
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="h-9 px-4 rounded-full text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1.5 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Flip
        </button>

        <button
          onClick={() => go(1)}
          disabled={index === cards.length - 1}
          className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}