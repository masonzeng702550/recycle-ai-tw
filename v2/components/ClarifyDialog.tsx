"use client";

import { useState } from "react";
import type { UncertainResult } from "@/lib/types";

interface Props {
  result: UncertainResult;
  onSubmit: (qa: { q: string; a: string }[]) => void;
  onCancel: () => void;
}

export default function ClarifyDialog({ result, onSubmit, onCancel }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = result.questions.every((q) => answers[q.id]);

  function submit() {
    const qa = result.questions.map((q) => ({
      q: q.q,
      a: answers[q.id] ?? "未回答",
    }));
    onSubmit(qa);
  }

  return (
    <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 space-y-5">
      <header className="flex items-start gap-3">
        <span className="text-2xl">❓</span>
        <div>
          <h2 className="font-serif text-lg font-bold">
            {result.partialName ? `可能是「${result.partialName}」？` : "需要更多資訊"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            幫忙回答以下問題，AI 才能給出更準確的指引。
          </p>
        </div>
      </header>

      {result.requestBetterImage && (
        <p className="text-sm text-amber-400 bg-amber-950/30 border border-amber-900/40 rounded-xl px-4 py-3">
          建議：請改拍光線充足、物品完整露出的照片。
        </p>
      )}

      <ol className="space-y-4">
        {result.questions.map((q, idx) => (
          <li key={q.id} className="space-y-2">
            <p className="text-sm text-neutral-200">
              <span className="text-neutral-600 font-mono mr-1.5">Q{idx + 1}</span>
              {q.q}
            </p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected
                        ? "bg-white text-black border-white"
                        : "bg-neutral-800 border-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400"
        >
          重新拍照
        </button>
        <button
          onClick={submit}
          disabled={!allAnswered}
          className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30"
        >
          送出答案再判斷
        </button>
      </div>
    </div>
  );
}
