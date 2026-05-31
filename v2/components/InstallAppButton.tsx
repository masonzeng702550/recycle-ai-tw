"use client";

import { useEffect, useState } from "react";

// Chrome / Edge / Samsung / Brave fire this when the site qualifies for
// "Add to Home screen". We catch and defer it so we can trigger the
// prompt from our own button instead of letting the browser's mini-bar
// take over.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tf:installDismissedAt";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天內不重複跳

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // 桌機 Safari 偽裝 iPad 的情況也算進來：iPadOS 13+ 會回 MacIntel
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document)
  );
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS 用 navigator.standalone（非標準）
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

// 顯示條件：
//   - 已是 PWA 模式 → 完全不渲染
//   - 桌機 → 不渲染（這個功能是給手機回頭率用的）
//   - 行動裝置 + Android 有 beforeinstallprompt → 顯示「加入主畫面」按鈕
//   - 行動裝置 + iOS → 顯示按鈕，按下時跳教學
export default function InstallAppButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onBefore = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mounted) return null;
  if (isStandalone()) return null;
  if (recentlyDismissed()) return null;

  const ios = isIOS();
  const android = isAndroid();
  // 桌機就不顯示 — 這個功能訴求是手機回頭率
  if (!ios && !android) return null;

  // Android 但瀏覽器還沒 fire beforeinstallprompt：靜悄悄不顯示（避免按下沒反應）
  if (android && !installEvent) return null;

  async function handleAndroidInstall() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "dismissed") markDismissed();
      setInstallEvent(null);
    } catch (e) {
      console.warn("[install] prompt failed", e);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          if (ios) setIosOpen(true);
          else void handleAndroidInstall();
        }}
        aria-label="把 Trashform 加到手機桌面"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-600/90 hover:bg-sky-500 text-white text-sm font-medium active:scale-95 transition-all shadow-lg shadow-sky-900/40"
      >
        <DownloadIcon className="w-4 h-4" />
        加到手機桌面
      </button>

      {ios && (
        <IOSInstallSheet
          open={iosOpen}
          onClose={() => {
            setIosOpen(false);
            // 使用者看過了就先冷卻 7 天
            markDismissed();
          }}
        />
      )}
    </>
  );
}

function IOSInstallSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
        <header>
          <h2 className="font-serif text-xl font-bold">在 iPhone 加到主畫面</h2>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            iOS 的 Safari 不能用一鍵安裝，請依下面三步驟手動加入，
            之後就能像 App 一樣從主畫面打開 Trashform。
          </p>
        </header>

        <ol className="space-y-3 text-sm text-neutral-300">
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-800 text-xs flex items-center justify-center font-mono">
              1
            </span>
            <span>
              點下方工具列的{" "}
              <ShareIcon className="inline w-4 h-4 align-middle text-sky-400" />{" "}
              <span className="text-sky-300">分享</span> 按鈕
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-800 text-xs flex items-center justify-center font-mono">
              2
            </span>
            <span>
              往下捲，選「<span className="text-neutral-100">加入主畫面</span>」
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-800 text-xs flex items-center justify-center font-mono">
              3
            </span>
            <span>右上角按「加入」，主畫面就會多一顆 Trashform 圖示</span>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-white text-black text-sm font-semibold"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
