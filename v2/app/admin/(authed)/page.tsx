"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DailyLineChart, GroupBarChart } from "@/components/admin/StatsCharts";
import { ChartIcon, PrinterIcon } from "@/components/icons";
import type { AdminStatsResponse } from "@/lib/api-contracts";

const GROUP_LABELS_CSV: Record<string, string> = {
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

// 把儀表板資料拼成多 section 的 CSV。前面加 UTF-8 BOM 讓 Excel 直接認 utf-8 中文。
function buildCsv(stats: AdminStatsResponse): string {
  const esc = (v: string | number) => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows: string[] = [];
  rows.push("Trashform 儀表板匯出");
  rows.push(`匯出時間,${new Date().toLocaleString("zh-TW", { hour12: false })}`);
  rows.push("");
  rows.push("== 關鍵指標 ==");
  rows.push("項目,數值");
  rows.push(`總辨識數,${stats.totalRecognitions}`);
  rows.push(`已辨識,${stats.identifiedCount}`);
  rows.push(`不確定,${stats.uncertainCount}`);
  rows.push(`辨識錯誤,${stats.errorCount}`);
  rows.push(`錯誤回報數,${stats.reportCount}`);
  rows.push(
    `估計正確率,${stats.accuracyEstimate != null ? (stats.accuracyEstimate * 100).toFixed(1) + "%" : "N/A"}`,
  );
  rows.push("");
  rows.push("== 物品大類分布 ==");
  rows.push("大類,數量");
  for (const g of stats.byGroup) {
    rows.push(
      `${esc(GROUP_LABELS_CSV[g.group] ?? g.group)},${g.count}`,
    );
  }
  rows.push("");
  rows.push("== 近 30 天每日辨識量 ==");
  rows.push("日期,辨識數");
  for (const d of stats.byDay) {
    rows.push(`${d.day},${d.count}`);
  }
  return "﻿" + rows.join("\n");
}

function downloadCsv(stats: AdminStatsResponse) {
  const csv = buildCsv(stats);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trashform-stats-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("zh-TW");
}

interface KpiProps {
  label: string;
  value: string;
  hint?: string;
}

function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 font-serif font-bold text-3xl">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-neutral-600">{hint}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!resp.ok) {
        setError(`讀取失敗 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as AdminStatsResponse;
      setStats(data);
      setError(null);
      setUpdatedAt(new Date());
    } catch {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 只有「分頁可見」時才 polling，省 Neon CU。間隔拉到 60s。
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer) return;
      timer = setInterval(load, 60_000);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVis() {
      if (document.visibilityState === "visible") {
        load();
        start();
      } else {
        stop();
      }
    }
    load();
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const identifiedRate =
    stats && stats.totalRecognitions > 0
      ? stats.identifiedCount / stats.totalRecognitions
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl">儀表板</h1>
          <p className="text-sm text-neutral-500 mt-1">
            每 60 秒自動更新（分頁切走時暫停）
            {updatedAt &&
              ` · 最後更新 ${updatedAt.toLocaleTimeString("zh-TW")}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => stats && downloadCsv(stats)}
            disabled={!stats}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-4 py-1.5 text-sm hover:bg-neutral-900 disabled:opacity-40"
            title="把 KPI / 大類分布 / 每日辨識量匯出成 .csv，Excel 直接可開"
          >
            <ChartIcon className="w-4 h-4" />
            匯出 CSV
          </button>
          <Link
            href="/admin/export"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-4 py-1.5 text-sm hover:bg-neutral-900"
            title="開啟列印友善的完整報表（含圖表與所有表格），可從瀏覽器另存為 PDF"
          >
            <PrinterIcon className="w-4 h-4" />
            匯出報表（PDF）
          </Link>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm hover:bg-neutral-900"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi label="總辨識數" value={loading ? "…" : num(stats?.totalRecognitions)} />
        <Kpi
          label="已辨識率"
          value={loading ? "…" : pct(identifiedRate)}
          hint={
            stats
              ? `${num(stats.identifiedCount)} / ${num(stats.totalRecognitions)}`
              : undefined
          }
        />
        <Kpi label="錯誤回報數" value={loading ? "…" : num(stats?.reportCount)} />
        <Kpi
          label="估計正確率"
          value={loading ? "…" : pct(stats?.accuracyEstimate)}
          hint="1 − 錯誤回報 / 已辨識"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-bold text-lg">物品大類分布</h2>
            <span className="text-xs text-neutral-500">累計</span>
          </div>
          {stats && stats.byGroup.length > 0 ? (
            <GroupBarChart data={stats.byGroup} />
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-neutral-600">
              {loading ? "載入中…" : "尚無資料"}
            </div>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-bold text-lg">近 30 天辨識量</h2>
            <span className="text-xs text-neutral-500">每日</span>
          </div>
          {stats && stats.byDay.length > 0 ? (
            <DailyLineChart data={stats.byDay} />
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-neutral-600">
              {loading ? "載入中…" : "尚無資料"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
