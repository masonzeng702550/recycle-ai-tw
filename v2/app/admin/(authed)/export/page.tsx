"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PrinterIcon } from "@/components/icons";
import type { AdminStatsResponse } from "@/lib/api-contracts";

// 列印 / PDF 友善的儀表板報表頁。
// 螢幕上仍套用 admin (authed) layout 的 sidebar，但 sidebar 在 print:hidden 下不會印出。
// 報表本體用白底黑字（透過 Tailwind 的 print: 變體 + 自身 class 強制 light theme）
// 確保印出來不會是黑底。

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

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("zh-TW");
}

export default function ExportReportPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printedAt] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as AdminStatsResponse;
        setStats(d);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  const identifiedRate = useMemo(() => {
    if (!stats || stats.totalRecognitions === 0) return null;
    return stats.identifiedCount / stats.totalRecognitions;
  }, [stats]);

  const groupTotal = useMemo(
    () => (stats ? stats.byGroup.reduce((a, b) => a + b.count, 0) : 0),
    [stats],
  );
  const dayTotal = useMemo(
    () => (stats ? stats.byDay.reduce((a, b) => a + b.count, 0) : 0),
    [stats],
  );

  if (loading) {
    return <div className="text-sm text-neutral-500">載入中…</div>;
  }
  if (error || !stats) {
    return (
      <div className="text-sm text-red-400">讀取失敗：{error ?? "no data"}</div>
    );
  }

  return (
    // 強制 light theme：螢幕看也是白底，跟印出來一致避免「印出來才發現排版錯」
    <div className="bg-white text-neutral-900 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 md:-my-8 px-6 py-8 sm:px-10 sm:py-10 min-h-dvh">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 標頭 */}
        <header className="flex items-end justify-between gap-4 flex-wrap border-b border-neutral-300 pb-4">
          <div>
            <p className="text-xs text-neutral-500 tracking-widest uppercase mb-1">
              Trashform · Admin Report
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900">
              儀表板報表
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              產生時間：{printedAt.toLocaleString("zh-TW", { hour12: false })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-5 py-2 text-sm font-medium hover:bg-neutral-700"
          >
            <PrinterIcon className="w-4 h-4" />
            列印 / 另存 PDF
          </button>
        </header>

        {/* KPI 表格 */}
        <Section title="關鍵指標">
          <table className="w-full text-sm border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>
                <Th>項目</Th>
                <Th align="right">數值</Th>
                <Th>備註</Th>
              </tr>
            </thead>
            <tbody>
              <Row label="總辨識數" value={num(stats.totalRecognitions)} />
              <Row label="已辨識" value={num(stats.identifiedCount)} />
              <Row
                label="已辨識率"
                value={pct(identifiedRate)}
                note={`${num(stats.identifiedCount)} / ${num(stats.totalRecognitions)}`}
              />
              <Row label="不確定" value={num(stats.uncertainCount)} />
              <Row label="辨識錯誤" value={num(stats.errorCount)} />
              <Row label="錯誤回報數" value={num(stats.reportCount)} />
              <Row
                label="估計正確率"
                value={pct(stats.accuracyEstimate)}
                note="1 − 錯誤回報 / 已辨識"
              />
            </tbody>
          </table>
        </Section>

        {/* 物品大類分布 */}
        <Section title="物品大類分布（累計）">
          <div className="w-full h-80 bg-white border border-neutral-300 rounded-lg p-4 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.byGroup.map((g) => ({
                  label: GROUP_LABELS[g.group] ?? g.group,
                  count: g.count,
                }))}
                margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#404040", fontSize: 12 }}
                  stroke="#9ca3af"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#404040", fontSize: 12 }}
                  stroke="#9ca3af"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #d4d4d8",
                    borderRadius: 12,
                    color: "#0a0a0a",
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="count" fill="#0a0a0a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-sm border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>
                <Th>#</Th>
                <Th>大類</Th>
                <Th align="right">數量</Th>
                <Th align="right">佔比</Th>
              </tr>
            </thead>
            <tbody>
              {stats.byGroup.map((g, i) => (
                <tr key={g.group} className="border-t border-neutral-200">
                  <Td>{i + 1}</Td>
                  <Td>{GROUP_LABELS[g.group] ?? g.group}</Td>
                  <Td align="right">{num(g.count)}</Td>
                  <Td align="right">
                    {groupTotal > 0
                      ? `${((g.count / groupTotal) * 100).toFixed(1)}%`
                      : "—"}
                  </Td>
                </tr>
              ))}
              <tr className="border-t-2 border-neutral-400 bg-neutral-50 font-semibold">
                <Td colSpan={2}>合計</Td>
                <Td align="right">{num(groupTotal)}</Td>
                <Td align="right">100.0%</Td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* 近 30 天辨識量 */}
        <Section title="近 30 天每日辨識量">
          <div className="w-full h-80 bg-white border border-neutral-300 rounded-lg p-4 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.byDay}
                margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#404040", fontSize: 12 }}
                  stroke="#9ca3af"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "#404040", fontSize: 12 }}
                  stroke="#9ca3af"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #d4d4d8",
                    borderRadius: 12,
                    color: "#0a0a0a",
                  }}
                  cursor={{ stroke: "#9ca3af", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#00a96f"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#00a96f" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-sm border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>
                <Th>日期</Th>
                <Th align="right">辨識數</Th>
              </tr>
            </thead>
            <tbody>
              {stats.byDay.map((d) => (
                <tr key={d.day} className="border-t border-neutral-200">
                  <Td>{d.day}</Td>
                  <Td align="right">{num(d.count)}</Td>
                </tr>
              ))}
              <tr className="border-t-2 border-neutral-400 bg-neutral-50 font-semibold">
                <Td>合計</Td>
                <Td align="right">{num(dayTotal)}</Td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* 頁尾 */}
        <footer className="border-t border-neutral-300 pt-4 text-xs text-neutral-500 flex justify-between flex-wrap gap-2">
          <span>recycle-ai-tw.vercel.app · @trashform.team</span>
          <span>由 Trashform 後台儀表板自動產生</span>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h2 className="font-serif font-bold text-xl border-l-4 border-neutral-900 pl-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2 border-b border-neutral-300 text-xs font-semibold text-neutral-700 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-1.5 text-sm ${
        align === "right" ? "text-right font-mono" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <tr className="border-t border-neutral-200">
      <Td>{label}</Td>
      <Td align="right">{value}</Td>
      <Td>{note ?? ""}</Td>
    </tr>
  );
}
