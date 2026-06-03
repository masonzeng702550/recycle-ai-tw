"use client";

import { useState } from "react";
import {
  GROUP_EMOJI,
  GROUP_LABELS,
  getAllDisposals,
  getDisposal,
  getItem,
  disposalsDiffer,
} from "@/lib/catalog";
import type {
  CityId,
  IdentifiedComponent,
  IdentifiedResult,
  Item,
} from "@/lib/types";
import ReportDialog from "./ReportDialog";

interface Props {
  result: IdentifiedResult;
  cityId: CityId;
  cityName: string;
  onRetry: () => void;
  recognitionId: number | null;
  imageFile: File | null;
}

const CONF_LABEL: Record<IdentifiedResult["confidence"], string> = {
  high: "高度確定",
  medium: "大致確定",
  low: "推測可能",
};

const CONF_COLOR: Record<IdentifiedResult["confidence"], string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-rose-400",
};

export default function ResultCard({
  result,
  cityId,
  cityName,
  onRetry,
  recognitionId,
  imageFile,
}: Props) {
  const item = getItem(result.itemId);
  const [reportOpen, setReportOpen] = useState(false);

  if (!item) {
    return (
      <div className="rounded-3xl bg-neutral-900 p-5 text-sm text-neutral-400">
        無法在資料庫中找到此項目（{result.itemId}）。
        <button
          onClick={onRetry}
          className="block w-full mt-4 py-3 rounded-full bg-white text-black text-sm font-semibold"
        >
          重新辨識
        </button>
      </div>
    );
  }

  const { rule, isItemSpecific } = getDisposal(cityId, item);
  const tips = [...(rule.notes ?? []), ...(item.defaultTips ?? [])];
  const composite = result.components && result.components.length >= 2;

  return (
    <div className="rounded-3xl bg-neutral-900 overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">
            {item.emoji ?? GROUP_EMOJI[result.group]}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-50 truncate">
              {result.itemName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-sm ${CONF_COLOR[result.confidence]}`}>
                {CONF_LABEL[result.confidence]}
              </span>
              <span className="text-neutral-700">·</span>
              <span className="text-sm text-neutral-300">
                {GROUP_LABELS[result.group]}
              </span>
              {composite && (
                <>
                  <span className="text-neutral-700">·</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-900/50 text-amber-300">
                    複合材質 · 需分拆
                  </span>
                </>
              )}
              {!isItemSpecific && !composite && (
                <>
                  <span className="text-neutral-700">·</span>
                  <span className="text-[10px] text-neutral-600">
                    使用大類預設規則
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {composite ? (
          <ComponentBreakdown
            components={result.components!}
            cityId={cityId}
            cityName={cityName}
          />
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="font-serif text-sm font-semibold text-neutral-400 tracking-wide">
                {cityName}處理方式
              </h3>
              <p className="text-base sm:text-lg text-neutral-100 leading-relaxed">
                {rule.disposal}
              </p>
            </section>

            {rule.binColor && (
              <div className="flex items-center gap-2 text-base text-neutral-300 bg-neutral-800 rounded-xl px-4 py-3">
                <span className="text-xl">🗑️</span>
                <span>
                  投入：
                  <strong className="text-lg text-neutral-50">
                    {rule.binColor}
                  </strong>
                </span>
              </div>
            )}

            {rule.schedule && (
              <div className="flex items-center gap-2 text-base text-neutral-300 bg-neutral-800 rounded-xl px-4 py-3">
                <span className="text-xl">🕒</span>
                <span>{rule.schedule}</span>
              </div>
            )}

            <CityDifference item={item} cityId={cityId} />
          </>
        )}

        <section className="space-y-2">
          <h3 className="font-serif text-sm font-semibold text-neutral-400 tracking-wide">
            判斷說明
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {result.explanation || "—"}
          </p>
        </section>

        {tips.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-serif text-sm font-semibold text-neutral-400 tracking-wide">
              注意事項
            </h3>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="text-base text-neutral-300 flex gap-2 leading-relaxed">
                  <span className="text-neutral-600 shrink-0">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {rule.sourceUrl && (
          <a
            href={rule.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-blue-400 hover:underline"
          >
            🔗 法規依據
          </a>
        )}
      </div>

      <div className="px-5 sm:px-6 pb-5 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setReportOpen(true)}
          className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-800"
        >
          🚩 回報分錯了
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold"
        >
          重新辨識其他物品
        </button>
      </div>

      <ReportDialog
        open={reportOpen}
        currentItemId={item.id}
        onClose={() => setReportOpen(false)}
        recognitionId={recognitionId}
        imageFile={imageFile}
        cityId={cityId}
      />
    </div>
  );
}

// 各縣市處理方式比較。只在各縣市規則真的不同時展開，避免誤導「縣市沒差」。
function CityDifference({ item, cityId }: { item: Item; cityId: CityId }) {
  const [open, setOpen] = useState(false);
  const all = getAllDisposals(item);
  if (all.length < 2) return null;

  const differ = disposalsDiffer(item);

  if (!differ) {
    return (
      <p className="text-xs text-neutral-600">
        此物品在 {all.map((d) => d.cityName).join("、")} 的處理方式相同。
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-amber-300"
        aria-expanded={open}
      >
        <span className="text-sm">🆚</span>
        <span>各縣市處理方式不同 — {open ? "收合" : "看其他縣市"}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {open && (
        <ul className="space-y-2">
          {all.map((d) => {
            const current = d.cityId === cityId;
            return (
              <li
                key={d.cityId}
                className={`rounded-xl px-4 py-3 border ${
                  current
                    ? "bg-amber-950/30 border-amber-900/50"
                    : "bg-neutral-950/60 border-neutral-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-sm font-semibold ${
                      current ? "text-amber-200" : "text-neutral-200"
                    }`}
                  >
                    {d.cityName}
                  </span>
                  {current && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/60 text-amber-200">
                      目前縣市
                    </span>
                  )}
                  {d.rule.binColor && (
                    <span className="text-[11px] text-neutral-400">
                      · {d.rule.binColor}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {d.rule.disposal}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ComponentBreakdown({
  components,
  cityId,
  cityName,
}: {
  components: IdentifiedComponent[];
  cityId: CityId;
  cityName: string;
}) {
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h3 className="font-serif text-xs font-semibold text-amber-300 uppercase tracking-widest">
          {cityName}分拆處理方式
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          此物品由多種材質組成，請拆解後分別處理：
        </p>
      </header>

      <ul className="space-y-3">
        {components.map((c, i) => {
          const cItem = getItem(c.itemId);
          if (!cItem) return null;
          const { rule } = getDisposal(cityId, cItem);
          return (
            <li
              key={`${c.itemId}-${i}`}
              className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl shrink-0">
                  {cItem.emoji ?? GROUP_EMOJI[c.group]}
                </span>
                <span className="font-semibold text-neutral-100">
                  {c.itemName}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                  {GROUP_LABELS[c.group]}
                </span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {rule.disposal}
              </p>
              {rule.binColor && (
                <div className="text-xs text-neutral-400">
                  → <span className="text-neutral-200">{rule.binColor}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
