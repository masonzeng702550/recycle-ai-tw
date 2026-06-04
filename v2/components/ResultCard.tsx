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
import { resultMessage } from "@/lib/share";
import { renderResultStory } from "@/lib/story-image";
import type {
  CityId,
  IdentifiedComponent,
  IdentifiedResult,
  Item,
} from "@/lib/types";
import ReportDialog from "./ReportDialog";
import ShareButtons from "./ShareButtons";

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
      {/* ─── 標頭：物品名 + 信心度 + 大類 ─── */}
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
            </div>
          </div>
        </div>
      </div>

      {/* ─── 主要區：回收種類 + 處理方式 + 投入桶 ─── */}
      <div className="p-5 sm:p-6 space-y-4">
        {composite ? (
          <ComponentBreakdown
            components={result.components!}
            cityId={cityId}
            cityName={cityName}
          />
        ) : (
          <PrimaryDisposal cityName={cityName} rule={rule} group={result.group} />
        )}

        {/* ─── 行動裝置分享按鈕（IG 限時動態 / LINE）─── */}
        <ShareButtons
          getStoryImage={() =>
            renderResultStory({
              itemEmoji: item.emoji ?? GROUP_EMOJI[result.group],
              itemName: result.itemName,
              groupLabel: GROUP_LABELS[result.group],
              cityName,
              disposal: rule.disposal,
              binColor: rule.binColor ?? null,
              composite: !!composite,
            })
          }
          message={resultMessage({
            itemName: result.itemName,
            groupLabel: GROUP_LABELS[result.group],
            cityName,
            disposal: rule.disposal,
            binColor: rule.binColor ?? null,
            composite: !!composite,
          })}
          size="md"
          label={`Trashform 辨識結果：${result.itemName}`}
        />

        {/* ─── 次要區：全部收合 ─── */}
        <div className="space-y-2 pt-1">
          {/* AI 判斷說明 */}
          {result.explanation && (
            <Collapsible title="為什麼判斷成這個？">
              <p className="text-sm text-neutral-300 leading-relaxed">
                {result.explanation}
              </p>
            </Collapsible>
          )}

          {/* 注意事項 */}
          {tips.length > 0 && (
            <Collapsible title={`注意事項（${tips.length} 點）`}>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-sm text-neutral-300 flex gap-2 leading-relaxed"
                  >
                    <span className="text-neutral-600 shrink-0">·</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Collapsible>
          )}

          {/* 各縣市差異（複合材質不顯示，避免太雜）*/}
          {!composite && <CityDifference item={item} cityId={cityId} />}

          {/* 預設規則提示（資料庫沒這個物品的細則時的小註記） */}
          {!isItemSpecific && !composite && (
            <p className="text-[11px] text-neutral-600 pl-1">
              此項目使用大類預設規則
            </p>
          )}

          {/* 法規依據（單一連結，不收合） */}
          {rule.sourceUrl && (
            <a
              href={rule.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-blue-400 hover:underline pt-1"
            >
              🔗 法規依據
            </a>
          )}
        </div>
      </div>

      {/* ─── 操作鈕 ─── */}
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

// ─── 主要處理方式區（單一物品）──────────────────────
// 把「回收種類」「處理方式」「投入桶 / 時段」放在最顯眼位置。
function PrimaryDisposal({
  cityName,
  rule,
  group,
}: {
  cityName: string;
  rule: ReturnType<typeof getDisposal>["rule"];
  group: IdentifiedResult["group"];
}) {
  return (
    <section className="space-y-3">
      {/* 回收種類 chip */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 text-xs text-neutral-300">
        <span>{GROUP_EMOJI[group]}</span>
        <span>{GROUP_LABELS[group]}</span>
      </div>

      {/* 處理方式（最大字體） */}
      <div>
        <h3 className="text-[11px] font-semibold text-neutral-500 tracking-widest uppercase mb-1.5">
          {cityName}處理方式
        </h3>
        <p className="text-lg sm:text-xl text-neutral-50 font-medium leading-relaxed">
          {rule.disposal}
        </p>
      </div>

      {/* 投入桶 + 時段：並列在一起 */}
      {(rule.binColor || rule.schedule) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rule.binColor && (
            <div className="flex items-center gap-2 bg-neutral-800 rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">🗑️</span>
              <div className="min-w-0">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  投入
                </div>
                <div className="text-base text-neutral-50 font-semibold truncate">
                  {rule.binColor}
                </div>
              </div>
            </div>
          )}
          {rule.schedule && (
            <div className="flex items-center gap-2 bg-neutral-800 rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">🕒</span>
              <div className="min-w-0">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  時段
                </div>
                <div className="text-sm text-neutral-100 leading-snug">
                  {rule.schedule}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── 收合元件 ───────────────────────────────────────
// 用原生 <details>，由 globals.css 已調好 cursor / list-style。
function Collapsible({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  const summaryCls =
    tone === "warn"
      ? "text-amber-300 hover:text-amber-200"
      : "text-neutral-300 hover:text-neutral-100";
  return (
    <details className="group bg-neutral-950/50 border border-neutral-800 rounded-xl">
      <summary
        className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium select-none ${summaryCls}`}
      >
        <span className="truncate">{title}</span>
        <span className="text-xs text-neutral-500 transition-transform group-open:rotate-180 shrink-0">
          ⌄
        </span>
      </summary>
      <div className="px-4 pb-3 pt-1 border-t border-neutral-800/60">
        {children}
      </div>
    </details>
  );
}

// ─── 各縣市處理方式（收合）─────────────────────────
// 統一用 Collapsible：不論「不同」或「相同」都收起來，避免主畫面雜亂。
// 標題與配色會依「是否相同」切換，讓使用者一眼就知道要不要展開。
function CityDifference({ item, cityId }: { item: Item; cityId: CityId }) {
  const all = getAllDisposals(item);
  if (all.length < 2) return null;
  const differ = disposalsDiffer(item);
  const cityList = all.map((d) => d.cityName).join("、");

  return (
    <Collapsible
      title={differ ? "各縣市處理方式不同" : `各縣市處理方式（皆相同）`}
      tone={differ ? "warn" : "neutral"}
    >
      {!differ && (
        <p className="text-xs text-neutral-500 mb-2 leading-relaxed">
          此物品在 {cityList} 的處理方式相同。
        </p>
      )}
      <ul className="space-y-2 mt-1">
        {all.map((d) => {
          const current = d.cityId === cityId;
          // 「不同」時凸顯目前縣市；「相同」時全部用中性色，避免假裝有差別
          const highlight = differ && current;
          return (
            <li
              key={d.cityId}
              className={`rounded-lg px-3 py-2 border ${
                highlight
                  ? "bg-amber-950/30 border-amber-900/50"
                  : "bg-neutral-950/60 border-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-sm font-semibold ${
                    highlight ? "text-amber-200" : "text-neutral-200"
                  }`}
                >
                  {d.cityName}
                </span>
                {current && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      differ
                        ? "bg-amber-900/60 text-amber-200"
                        : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
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
    </Collapsible>
  );
}

// ─── 複合材質拆解 ───────────────────────────────────
// 每個部件的「投入桶」是主要資訊，「大類 chip」改放成小註，
// 不讓畫面被一堆 chip 塞滿。
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
        <h3 className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest">
          {cityName} · 拆解後分別處理
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          此物品由多種材質組成，請拆解後逐項處理：
        </p>
      </header>

      <ul className="space-y-2">
        {components.map((c, i) => {
          const cItem = getItem(c.itemId);
          if (!cItem) return null;
          const { rule } = getDisposal(cityId, cItem);
          return (
            <li
              key={`${c.itemId}-${i}`}
              className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4 space-y-1.5"
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl shrink-0">
                  {cItem.emoji ?? GROUP_EMOJI[c.group]}
                </span>
                <span className="text-base font-semibold text-neutral-50">
                  {c.itemName}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {GROUP_LABELS[c.group]}
                </span>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">
                {rule.disposal}
              </p>
              {rule.binColor && (
                <div className="text-xs text-neutral-300">
                  🗑️ 投入：
                  <span className="text-neutral-50 font-medium">
                    {rule.binColor}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
