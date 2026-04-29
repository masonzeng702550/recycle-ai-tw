"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function ApiKeyGate({ open, onClose, onSave }: Props) {
  const [val, setVal] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
        <header>
          <h2 className="font-serif text-xl font-bold">需要你的 Gemini API Key</h2>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            為了保護隱私，本網站不在伺服器保存任何金鑰。你的 API Key 只會存在這個瀏覽器的 LocalStorage 內，圖片也是直接從你的瀏覽器送往 Google。
          </p>
        </header>

        <div className="space-y-2">
          <label className="text-xs text-neutral-400">Gemini API Key</label>
          <input
            type="password"
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="貼上你的 API Key"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-neutral-600"
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-blue-400 hover:underline"
          >
            👉 前往 Google AI Studio 取得免費 API Key
          </a>
        </div>

        <div className="text-xs text-amber-400/80 bg-amber-950/30 border border-amber-900/40 rounded-lg p-3 leading-relaxed">
          ⚠️ 請使用個人或測試用 Key，避免使用組織付費 Key。本工具不會將 Key 上傳，但前端可能會在你的瀏覽器留下紀錄。
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400"
          >
            稍後再說
          </button>
          <button
            onClick={() => {
              if (val.trim()) {
                onSave(val.trim());
              }
            }}
            disabled={!val.trim()}
            className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30"
          >
            儲存並開始
          </button>
        </div>
      </div>
    </div>
  );
}
