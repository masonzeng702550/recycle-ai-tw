"use client";

import { useCallback, useEffect, useState } from "react";
import { DailyLineChart, GroupBarChart } from "@/components/admin/StatsCharts";
import type { AdminStatsResponse } from "@/lib/api-contracts";

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
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
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
            每 30 秒自動更新
            {updatedAt &&
              ` · 最後更新 ${updatedAt.toLocaleTimeString("zh-TW")}`}
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
