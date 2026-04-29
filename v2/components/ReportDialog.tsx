"use client";

import { useState } from "react";
import { items as ALL_ITEMS } from "@/lib/catalog";
import { addReport } from "@/lib/storage";

interface Props {
  open: boolean;
  currentItemId: string;
  onClose: () => void;
}

export default function ReportDialog({ open, currentItemId, onClose }: Props) {
  const [reportedItemId, setReportedItemId] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  if (!open) return null;

  function submit() {
    addReport({
      ts: Date.now(),
      itemId: currentItemId,
      reportedItemId: reportedItemId || undefined,
      reason: reason.trim() || undefined,
    });
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setReportedItemId("");
      setReason("");
      onClose();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
        {done ? (
          <div className="py-10 text-center space-y-2">
            <div className="text-3xl">✓</div>
            <p className="text-sm text-neutral-300">已記錄回報，謝謝！</p>
            <p className="text-xs text-neutral-600">
              回報暫存在你的瀏覽器，未來版本會匯整改善資料庫。
            </p>
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
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-600"
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
                placeholder="例如：這其實是紙容器，不是一般紙類…"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-600 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400"
              >
                取消
              </button>
              <button
                onClick={submit}
                className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold"
              >
                送出
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
