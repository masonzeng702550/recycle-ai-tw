"use client";

import { SOCIAL } from "@/lib/social";

interface Props {
  open: boolean;
  onClose: () => void;
}

// 第一次辨識成功後彈出，提示使用者追蹤 IG / 留下回饋。
// 只跳一次（透過 storage.getPromoShown / setPromoShown 控制）。
// RWD：手機底部 sheet 風格、桌機置中卡片，按鈕全寬避免誤點。
export default function FirstSuccessPromo({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5">
        <header className="space-y-2 text-center">
          <div className="text-3xl">🎉</div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold">
            感謝你使用 Trashform！
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            這是你第一次成功辨識！我們是高中生團隊，能不能花 30 秒
            追蹤我們的 IG，或留下一點回饋讓工具變得更準確？
          </p>
        </header>

        <div className="space-y-2">
          <a
            href={SOCIAL.instagram}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 text-white text-sm font-semibold hover:brightness-110 active:scale-95 transition-all"
          >
            <InstagramIcon className="w-4 h-4" />
            追蹤 @trashform.team
          </a>
          <a
            href={SOCIAL.feedbackForm}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-semibold active:scale-95 transition-all"
          >
            <FormIcon className="w-4 h-4" />
            填寫回饋表單（約 1 分鐘）
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full border border-neutral-800 text-xs sm:text-sm text-neutral-400 hover:bg-neutral-900"
        >
          晚點再說
        </button>
      </div>
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

function FormIcon({ className }: { className?: string }) {
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
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}
