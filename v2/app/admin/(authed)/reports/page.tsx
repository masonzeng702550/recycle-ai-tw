"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminReportsResponse } from "@/lib/api-contracts";
import type { ErrorReportRecord } from "@/lib/types";

const PAGE_SIZE = 100;

const CITY_LABELS: Record<string, string> = {
  taipei: "臺北市",
  kaohsiung: "高雄市",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", { hour12: false });
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ErrorReportRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/reports?limit=${PAGE_SIZE}&offset=${offset}`;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) {
        setError(`讀取失敗 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as AdminReportsResponse;
      setReports(data.reports);
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

  const hasNext = reports.length === PAGE_SIZE;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl">錯誤回報</h1>
          <p className="text-sm text-neutral-500 mt-1">
            圖片永久保留於 Vercel Blob，供管理員審查與資料庫改善
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm hover:bg-neutral-900"
        >
          重新整理
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {loading && reports.length === 0 ? (
        <div className="text-center text-neutral-600 py-10">載入中…</div>
      ) : reports.length === 0 ? (
        <div className="text-center text-neutral-600 py-10">尚無回報</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <article
              key={r.id}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col"
            >
              <a
                href={`/api/admin/blob-proxy?p=${encodeURIComponent(r.blobPathname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-black aspect-video relative group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/blob-proxy?p=${encodeURIComponent(r.blobPathname)}`}
                  alt={`回報 #${r.id}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
                <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/70 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  點擊放大
                </span>
              </a>
              <div className="p-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span>#{r.id}</span>
                    {r.source === "auto_uncertain" ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-900/50 text-[10px] text-amber-300">
                        異動回報 · AI 不確定
                      </span>
                    ) : r.source === "auto_error" ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-orange-950/60 border border-orange-900/50 text-[10px] text-orange-300">
                        異動回報 · AI 失敗
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-900/50 text-[10px] text-rose-300">
                        人工回報
                      </span>
                    )}
                  </span>
                  <span>{fmtTime(r.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                  <span>
                    縣市：
                    {r.cityId
                      ? CITY_LABELS[r.cityId] ?? r.cityId
                      : "—"}
                  </span>
                  <span>
                    對應辨識 ID：{r.recognitionId ?? "—"}
                  </span>
                </div>
                <div className="text-neutral-200">
                  <span className="text-neutral-500 text-xs mr-1.5">
                    使用者建議的正確物品：
                  </span>
                  {r.reportedItemId ?? "—"}
                </div>
                {r.userComment && (
                  <div className="text-neutral-300 bg-neutral-950/60 border border-neutral-800 rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {r.userComment}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

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
