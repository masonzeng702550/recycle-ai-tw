import { SOCIAL } from "@/lib/social";

// 首頁的 IG / 回饋表單外連按鈕。
// 用 Fragment：父層用 flex flex-wrap gap-2 統一排版，方便和其他 pill
// （例如「加到手機桌面」）並排，個別在窄螢幕上自動換行。
export default function SocialLinks() {
  return (
    <>
      <a
        href={SOCIAL.instagram}
        target="_blank"
        rel="noreferrer"
        aria-label="追蹤 Trashform Instagram"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 text-white text-sm font-medium hover:brightness-110 active:scale-95 transition-all"
      >
        <InstagramIcon className="w-4 h-4" />
        追蹤 IG
      </a>
      <a
        href={SOCIAL.feedbackForm}
        target="_blank"
        rel="noreferrer"
        aria-label="填寫 Trashform 回饋表單"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-medium active:scale-95 transition-all"
      >
        <FormIcon className="w-4 h-4" />
        填寫回饋表單
      </a>
    </>
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
