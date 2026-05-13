"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminRecordsResponse } from "@/lib/api-contracts";
import type { RecognitionRecord } from "@/lib/types";

const PAGE_SIZE = 100;

const GROUP_LABELS: Record<string, string> = {
  paper: "紙類",
  plastic: "塑膠",
  glass: "玻璃",
  metal: "金屬",
  food: "廚餘",
  general: "一般垃圾",
  hazardous: "有害",
  large: "大型",
  electronics: "電子",
  clothing: "衣物",
};

const CITY_LABELS: Record<string, string> = {
  taipei: "臺北市",
  kaohsiung: "高雄市",
};

function statusBadge(status: RecognitionRecord["status"]) {
  switch (status) {
    case "identified":
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs">
          已辨識
        </span>
      );
    case "uncertain":
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs">
          不確定
        </span>
      );
    case "error":
    default:
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full bg-red-950/60 border border-red-900/60 text-red-300 text-xs">
          錯誤
        </span>
      );
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", { hour12: false });
}

function fmtSource(r: RecognitionRecord): string {
  if (r.keyMode === "org") return r.orgCode ? `組織 · ${r.orgCode}` : "組織";
  return "自備金鑰";
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecognitionRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/records?limit=${PAGE_SIZE}&offset=${offset}`;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) {
        setError(`讀取失敗 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as AdminRecordsResponse;
      setRecords(data.records);
      setError(null);
    } catch {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [auto, load]);

  const hasNext = records.length === PAGE_SIZE;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl">辨識紀錄</h1>
          <p className="text-sm text-neutral-500 mt-1">
            每頁 {PAGE_SIZE} 筆 · 顯示第 {offset + 1}–{offset + records.length} 筆
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-neutral-400 select-none">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="accent-white"
            />
            自動更新（30 秒）
          </label>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-neutral-800 px-4 py-1.5 hover:bg-neutral-900"
          >
            重新整理
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-950 text-neutral-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium">時間</th>
              <th className="px-4 py-3 text-left font-medium">縣市</th>
              <th className="px-4 py-3 text-left font-medium">狀態</th>
              <th className="px-4 py-3 text-left font-medium">物品</th>
              <th className="px-4 py-3 text-left font-medium">大類</th>
              <th className="px-4 py-3 text-left font-medium">信心</th>
              <th className="px-4 py-3 text-left font-medium">來源</th>
            </tr>
          </thead>
          <tbody>
            {loading && records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-600">
                  載入中…
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-600">
                  尚無資料
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-800/80 hover:bg-neutral-950/40"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap text-neutral-300">
                    {fmtTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">
                    {CITY_LABELS[r.cityId] ?? r.cityId}
                  </td>
                  <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                  <td className="px-4 py-2.5 text-neutral-100">
                    {r.itemName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">
                    {r.groupName ? GROUP_LABELS[r.groupName] ?? r.groupName : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">
                    {r.confidence ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-400 text-xs">
                    {fmtSource(r)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-3">
        {loading && records.length === 0 ? (
          <div className="text-center text-neutral-600 py-6">載入中…</div>
        ) : records.length === 0 ? (
          <div className="text-center text-neutral-600 py-6">尚無資料</div>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">{fmtTime(r.createdAt)}</span>
                {statusBadge(r.status)}
              </div>
              <div className="text-base text-neutral-100 font-medium">
                {r.itemName ?? "—"}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
                <span>{CITY_LABELS[r.cityId] ?? r.cityId}</span>
                <span>
                  大類：
                  {r.groupName ? GROUP_LABELS[r.groupName] ?? r.groupName : "—"}
                </span>
                <span>信心：{r.confidence ?? "—"}</span>
                <span>{fmtSource(r)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          disabled={offset === 0 || loading}
          className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm disabled:opacity-40 hover:bg-neutral-900"
        >
          上一頁
        </button>
        <span className="text-xs text-neutral-500">offset {offset}</span>
        <button
          type="button"
          onClick={() => setOffset(offset + PAGE_SIZE)}
          disabled={!hasNext || loading}
          className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm disabled:opacity-40 hover:bg-neutral-900"
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
