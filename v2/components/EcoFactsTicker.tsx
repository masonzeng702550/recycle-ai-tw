"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EcoFactsResponse } from "@/lib/api-contracts";
import { ecoFactMessage } from "@/lib/share";
import { renderEcoFactStory } from "@/lib/story-image";
import ShareButtons from "./ShareButtons";

// 辨識中畫面：隨機抓 1~3 則環保冷知識，依辨識時間輪流播放。
// 任何抓取失敗都靜默隱藏，不影響辨識主流程。
export default function EcoFactsTicker() {
  const [facts, setFacts] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    // 隨機 1~3 則
    const count = 1 + Math.floor(Math.random() * 3);
    const controller = new AbortController();
    fetch(`/api/eco-facts?count=${count}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<EcoFactsResponse>) : null))
      .then((d) => {
        if (d?.facts?.length) setFacts(d.facts);
      })
      .catch(() => {
        /* 靜默忽略（含 abort） */
      });
    return () => controller.abort();
  }, []);

  // 多於一則時才輪播；每 ~3.6s 換下一則。
  useEffect(() => {
    if (facts.length <= 1) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % facts.length),
      3600,
    );
    return () => clearInterval(t);
  }, [facts.length]);

  if (facts.length === 0) return null;

  const safeIdx = idx % facts.length;
  const currentFact = facts[safeIdx];

  return <Card fact={currentFact} facts={facts} idx={safeIdx} />;
}

function Card({
  fact,
  facts,
  idx,
}: {
  fact: string;
  facts: string[];
  idx: number;
}) {
  // 把目前播到的那則放進 closure，按鈕點下去就分享那一則
  const getImage = useCallback(() => renderEcoFactStory(fact), [fact]);

  return (
    <div className="w-full max-w-xs rounded-2xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-left">
      <p className="text-xs font-semibold text-emerald-300 mb-1.5">
        💡 環保冷知識
      </p>
      <p
        key={idx}
        className="eco-fact-enter text-sm text-neutral-200 leading-relaxed"
      >
        {fact}
      </p>
      {facts.length > 1 && (
        <div className="flex gap-1.5 mt-2.5" aria-hidden>
          {facts.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-4 bg-emerald-400" : "w-1.5 bg-neutral-700"
              }`}
            />
          ))}
        </div>
      )}
      {/* 行動裝置分享按鈕（桌機自動隱藏） */}
      <div className="mt-3 pt-3 border-t border-neutral-800">
        <ShareButtons
          getStoryImage={getImage}
          message={ecoFactMessage(fact)}
          size="sm"
          label="Trashform 環保冷知識"
        />
      </div>
    </div>
  );
}
