"use client";

import { useEffect, useState } from "react";
import {
  canShareFiles,
  copyText,
  IG_HANDLE,
  isShareCapable,
  shareImageFile,
  shareToLine,
  SITE_URL,
} from "@/lib/share";

interface Props {
  // 取得限時動態 PNG（呼叫時才生圖，避免頁面 idle 時的浪費）
  getStoryImage: () => Promise<File>;
  // 給 LINE / 分享 fallback 用的文字（會自動接 SITE_URL）
  message: string;
  // 「IG 限時動態」「LINE」按鈕的尺寸 — sm 用在 EcoFactsTicker，md 用在 ResultCard
  size?: "sm" | "md";
  // 標題（行動裝置原生 share sheet 會看到，且非必填）
  label?: string;
}

// 行動裝置才會渲染（用 navigator.share 偵測 + (pointer: coarse)）。
// 兩顆按鈕：IG 限時動態（產圖 + Web Share）、LINE（URL scheme）。
export default function ShareButtons({
  getStoryImage,
  message,
  size = "md",
  label,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [supportsFiles, setSupportsFiles] = useState(false);
  const [supportsAny, setSupportsAny] = useState(false);
  const [igBusy, setIgBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSupportsFiles(canShareFiles());
    setSupportsAny(isShareCapable());
  }, []);

  if (!mounted) return null;
  // 桌機 / 不支援 share API → 不渲染。LINE 在桌機也跑得起來但會把使用者推到
  // 桌機 LINE web app，體驗很差，所以一視同仁只在行動裝置顯示。
  if (!supportsAny) return null;

  async function onIg() {
    if (igBusy) return;
    setIgBusy(true);
    setErr(null);
    setTip(null);
    try {
      const file = await getStoryImage();
      if (!supportsFiles) {
        setErr("此瀏覽器不支援檔案分享，請改用 LINE。");
        return;
      }
      // 先把網址寫進剪貼簿 — 使用者在 IG 加「連結貼紙」時直接貼上
      const copied = await copyText(SITE_URL);
      const r = await shareImageFile(file, label);
      if (r === "shared") {
        setTip(
          copied
            ? `已複製網址 — 在 IG 限時動態加「連結貼紙」貼上，並標記 ${IG_HANDLE}`
            : `分享好了。記得加「連結貼紙」貼上 ${SITE_URL}，並標記 ${IG_HANDLE}`,
        );
        window.setTimeout(() => setTip(null), 9000);
      } else if (r === "unsupported") {
        setErr("分享 API 不可用");
      }
    } catch (e) {
      console.error("[share] IG story failed", e);
      setErr("分享失敗，請重試");
    } finally {
      setIgBusy(false);
    }
  }

  function onLine() {
    shareToLine(message, SITE_URL);
  }

  const padCls = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  const iconCls = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onIg}
        disabled={igBusy}
        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 text-white font-medium hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 ${padCls}`}
        aria-label="分享到 Instagram 限時動態"
      >
        <InstagramIcon className={iconCls} />
        {igBusy ? "處理中…" : "IG 限時動態"}
      </button>
      <button
        type="button"
        onClick={onLine}
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#06c755] hover:brightness-110 text-white font-medium active:scale-95 transition-all ${padCls}`}
        aria-label="分享到 LINE"
      >
        <LineIcon className={iconCls} />
        LINE
      </button>
      {err && (
        <span className="text-[11px] text-rose-400 self-center w-full">
          {err}
        </span>
      )}
      {tip && (
        <p className="w-full text-[11px] sm:text-xs text-emerald-300 leading-relaxed bg-emerald-950/30 border border-emerald-900/40 rounded-lg px-3 py-2">
          ✅ {tip}
        </p>
      )}
    </div>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  // LINE 官方識別不允許重繪商標，這裡用通用的對話框 + LINE 字示意。
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.48 2 2 5.81 2 10.5c0 3.05 1.93 5.71 4.83 7.18-.13.42-.62 1.93-.7 2.18-.05.16-.14.59.31.32.45-.26 2.42-1.57 3.27-2.13.75.1 1.52.15 2.29.15 5.52 0 10-3.81 10-8.5S17.52 2 12 2zm-3.8 11.2H6.4c-.18 0-.32-.14-.32-.32V8.7c0-.18.14-.32.32-.32s.32.14.32.32v3.84h1.48c.18 0 .32.14.32.32 0 .18-.14.34-.32.34zm1.2-.32c0 .18-.14.32-.32.32s-.32-.14-.32-.32V8.7c0-.18.14-.32.32-.32s.32.14.32.32v4.18zm5.5 0c0 .14-.09.26-.22.3-.04.01-.08.02-.1.02-.1 0-.2-.05-.26-.13l-2.13-2.9v2.71c0 .18-.14.32-.32.32s-.32-.14-.32-.32V8.7c0-.14.09-.26.22-.3.03-.02.07-.02.1-.02.1 0 .2.05.26.13l2.13 2.9V8.7c0-.18.14-.32.32-.32s.32.14.32.32v4.18zm3.55-2.41c.18 0 .32.14.32.32 0 .18-.14.32-.32.32h-1.48v.94h1.48c.18 0 .32.14.32.32 0 .18-.14.32-.32.32H17c-.18 0-.32-.14-.32-.32V8.7c0-.18.14-.32.32-.32h1.79c.18 0 .32.14.32.32 0 .18-.14.32-.32.32h-1.48v.94h1.48z" />
    </svg>
  );
}
