"use client";

import { useState } from "react";
import { GROUP_EMOJI, GROUP_LABELS, getDisposal, getItem } from "@/lib/catalog";
import type { CityId, IdentifiedResult } from "@/lib/types";
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

  return (
    <div className="rounded-3xl bg-neutral-900 overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">
            {item.emoji ?? GROUP_EMOJI[result.group]}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-neutral-50 truncate">
              {result.itemName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs ${CONF_COLOR[result.confidence]}`}>
                {CONF_LABEL[result.confidence]}
              </span>
              <span className="text-neutral-700">·</span>
              <span className="text-xs text-neutral-400">
                {GROUP_LABELS[result.group]}
              </span>
              {!isItemSpecific && (
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
        <section className="space-y-2">
          <h3 className="font-serif text-xs font-semibold text-neutral-500 uppercase tracking-widest">
            {cityName}處理方式
          </h3>
          <p className="text-sm sm:text-base text-neutral-200 leading-relaxed">
            {rule.disposal}
          </p>
        </section>

        {rule.binColor && (
          <div className="flex items-center gap-2 text-sm text-neutral-400 bg-neutral-800 rounded-xl px-4 py-3">
            <span>🗑️</span>
            <span>
              投入：<strong className="text-neutral-100">{rule.binColor}</strong>
            </span>
          </div>
        )}

        {rule.schedule && (
          <div className="flex items-center gap-2 text-sm text-neutral-400 bg-neutral-800 rounded-xl px-4 py-3">
            <span>🕒</span>
            <span>{rule.schedule}</span>
          </div>
        )}

        <section className="space-y-2">
          <h3 className="font-serif text-xs font-semibold text-neutral-500 uppercase tracking-widest">
            判斷說明
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {result.explanation || "—"}
          </p>
        </section>

        {tips.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-serif text-xs font-semibold text-neutral-500 uppercase tracking-widest">
              注意事項
            </h3>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-neutral-400 flex gap-2">
                  <span className="text-neutral-700 shrink-0">·</span>
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
