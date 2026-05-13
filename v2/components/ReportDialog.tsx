"use client";

import { useState } from "react";
import { items as ALL_ITEMS } from "@/lib/catalog";
import { maybeResizeImage } from "@/lib/image-resize";
import { addReport } from "@/lib/storage";
import type { CityId } from "@/lib/types";

interface Props {
  open: boolean;
  currentItemId: string;
  onClose: () => void;
  recognitionId: number | null;
  imageFile: File | null;
  cityId: CityId;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; warn?: string }
  | { kind: "error"; message: string };

export default function ReportDialog({
  open,
  currentItemId,
  onClose,
  recognitionId,
  imageFile,
  cityId,
}: Props) {
  const [reportedItemId, setReportedItemId] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (!open) return null;

  function close() {
    setStatus({ kind: "idle" });
    setReportedItemId("");
    setReason("");
    onClose();
  }

  async function submit() {
    setStatus({ kind: "submitting" });

    // 不論伺服器有沒有成功，都先記到 LocalStorage（向下相容）
    addReport({
      ts: Date.now(),
      itemId: currentItemId,
      reportedItemId: reportedItemId || undefined,
      reason: reason.trim() || undefined,
    });

    let warn: string | undefined;
    if (!imageFile) {
      warn = "無法上傳照片，已僅記錄文字。";
    }

    try {
      const fd = new FormData();
      if (imageFile) {
        // 錯誤回報的圖要永久保留，但仍要過 4.5 MB body 上限。
        // 用較高解析度（3072）跟品質（0.92），admin 端仍能看清楚。
        const sendable = await maybeResizeImage(imageFile, {
          maxLongSide: 3072,
          quality: 0.92,
        });
        fd.append("image", sendable);
      }
      if (recognitionId !== null) {
        fd.append("recognitionId", String(recognitionId));
      }
      if (reportedItemId) fd.append("reportedItemId", reportedItemId);
      if (reason.trim()) fd.append("userComment", reason.trim());
      fd.append("cityId", cityId);

      const res = await fetch("/api/report-error", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        // 仍然視為已記錄（local），但提示伺服器端可能未收到
        setStatus({
          kind: "done",
          warn: warn ?? "已在本機記錄；伺服器同步失敗，可能稍後重試。",
        });
        setTimeout(close, 1800);
        return;
      }

      setStatus({ kind: "done", warn });
      setTimeout(close, 1500);
    } catch {
      setStatus({
        kind: "done",
        warn: warn ?? "已在本機記錄；網路錯誤無法同步至伺服器。",
      });
      setTimeout(close, 1800);
    }
  }

  const submitting = status.kind === "submitting";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
        {status.kind === "done" ? (
          <div className="py-10 text-center space-y-2">
            <div className="text-3xl">✓</div>
            <p className="text-sm text-neutral-300">已記錄回報，謝謝！</p>
            {status.warn ? (
              <p className="text-xs text-amber-400/80">{status.warn}</p>
            ) : (
              <p className="text-xs text-neutral-600">
                你的回報會協助改善資料庫。
              </p>
            )}
          </div>
        ) : (
          <>
            <header>
              <h2 className="font-serif text-lg font-bold">回報分錯了</h2>
              <p className="text-xs text-neutral-500 mt-1">
                若你認為剛才的辨識不正確，告訴我們應該屬於哪一項。
              </p>
            </header>

            <div className="space-y-2">
              <label className="text-xs text-neutral-400">應該是哪一項？</label>
              <select
                value={reportedItemId}
                onChange={(e) => setReportedItemId(e.target.value)}
                disabled={submitting}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
              >
                <option value="">（不確定，僅留下說明）</option>
                {ALL_ITEMS.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.nameZh}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-neutral-400">補充說明（選填）</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={submitting}
                placeholder="例如：這其實是紙容器，不是一般紙類…"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-600 resize-none disabled:opacity-50"
              />
            </div>

            {!imageFile && (
              <p className="text-xs text-amber-400/80">
                找不到原始照片，將只記錄文字回報。
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={close}
                disabled={submitting}
                className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "送出中…" : "送出"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
