"use client";

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  // 自動 reload 倒數秒數
  countdownSec?: number;
}

// Gemini 速率限制 / quota 暫時不可用時跳的「系統錯誤」彈窗。
// 倒數結束後自動 location.reload()，讓使用者重新拍攝再辨識。
// 使用者可手動點按鈕立刻 reload。
export default function SystemBusyModal({ open, countdownSec = 5 }: Props) {
  const [left, setLeft] = useState(countdownSec);

  useEffect(() => {
    if (!open) return;
    setLeft(countdownSec);
    const tick = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          clearInterval(tick);
          // 用 location.reload() 等同於 F5：清掉所有 in-memory state
          window.location.reload();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [open, countdownSec]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5">
        <header className="space-y-2 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold">
            系統錯誤
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            遇到暫時性的系統問題，{left} 秒後會自動重新整理頁面。
            請整理完後重新拍攝再辨識一次。
          </p>
        </header>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-full bg-white text-black text-sm font-semibold active:scale-95 transition-all"
        >
          立即重新整理
        </button>
      </div>
    </div>
  );
}
