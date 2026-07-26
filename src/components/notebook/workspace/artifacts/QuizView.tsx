"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export function QuizView({ content }: { content: { questions: Question[] } }) {
  const questions = content?.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return <p className="text-sm text-zinc-500">No quiz questions available.</p>;
  }

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0),
    0
  );

  function selectAnswer(qIndex: number, optIndex: number) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  }

  return (
    <div className="flex flex-col gap-6">
      {submitted && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-zinc-200">
          You scored <span className="font-semibold text-zinc-100">{score}</span> / {questions.length}
        </div>
      )}

      {questions.map((q, qIndex) => {
        const selected = answers[qIndex];
        return (
          <div key={qIndex} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm font-medium text-zinc-100 mb-3">
              {qIndex + 1}. {q.question}
            </p>

            <div className="flex flex-col gap-2">
              {q.options.map((opt, optIndex) => {
                const isSelected = selected === optIndex;
                const isCorrect = submitted && optIndex === q.answerIndex;
                const isWrongSelected = submitted && isSelected && optIndex !== q.answerIndex;

                return (
                  <button
                    key={optIndex}
                    onClick={() => selectAnswer(qIndex, optIndex)}
                    className={`flex items-center justify-between text-left text-sm rounded-xl px-4 py-2.5 border transition-colors ${
                      isCorrect
                        ? "border-green-700 bg-green-900/20 text-green-300"
                        : isWrongSelected
                        ? "border-red-800 bg-red-900/20 text-red-300"
                        : isSelected
                        ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <span>{opt}</span>
                    {isCorrect && <Check className="w-4 h-4 shrink-0" />}
                    {isWrongSelected && <X className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <p className="text-xs text-zinc-500 mt-3 leading-relaxed">{q.explanation}</p>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length !== questions.length}
          className="self-start h-10 px-5 rounded-full text-sm font-medium bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-40 disabled:hover:bg-zinc-700 transition-colors"
        >
          Check answers
        </button>
      )}
    </div>
  );
}