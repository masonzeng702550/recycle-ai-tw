"use client";

import { useEffect, useState } from "react";

// PWA standalone 開啟時播一次的過場動畫。
// 流程（總時長 ~1.4s）：
//   0     ms：偵測到 standalone，render overlay（黑色全螢幕 + Logo）
//   0–700 ms：Logo fade-in + 微縮放
//   400–900 ms：副標 fade-in
//   1000 ms：overlay 開始 fade-out（300ms transition）
//   1400 ms：unmount，使用者開始操作
//
// 用 sessionStorage 鎖：同一個 PWA 進程只跳一次，內部換頁不會重播；
// 關掉 PWA 重開（新進程 = sessionStorage 重設）會再播。

const SESSION_KEY = "tf:pwaSplashShown";
const FADE_START_MS = 1000;
const UNMOUNT_MS = 1400;

type Phase = "hidden" | "showing" | "fading";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function PWASplash() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // sessionStorage 被擋（無痕模式）就還是播一次
    }
    if (!isStandalone()) return;

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    setPhase("showing");

    const t1 = setTimeout(() => setPhase("fading"), FADE_START_MS);
    const t2 = setTimeout(() => setPhase("hidden"), UNMOUNT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      // z-[100] 蓋過所有現有 modal / sticky header
      className={`fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 ease-out ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
      // 不擋使用者點擊；動畫結束前 component 自己 unmount，所以不會卡住操作
      style={{ pointerEvents: phase === "fading" ? "none" : "auto" }}
      aria-hidden
    >
      <div className="pwa-splash-logo font-serif font-extrabold text-5xl sm:text-6xl leading-none select-none">
        <span style={{ color: "#00a96f" }}>T</span>
        rash
        <span style={{ color: "#fb9c00" }}>f</span>
        orm
      </div>
      <div className="pwa-splash-sub text-xs sm:text-sm text-neutral-500 font-mono tracking-[0.3em] uppercase select-none">
        Taiwan · Recycle · AI
      </div>
    </div>
  );
}
