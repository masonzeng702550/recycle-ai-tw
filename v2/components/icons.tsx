// 自製 stroke-based SVG 圖示集，全站非「辨識結果」區域統一使用。
// 為了視覺一致：viewBox 24×24、stroke="currentColor"、strokeWidth={2}、
// round line cap/join。色彩透過 Tailwind className 控制（text-emerald-300 等）。

type IconProps = { className?: string };

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M5 12.5l4.5 4.5L19.5 6.5" />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M12 3l10 17H2z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9 9.5a3 3 0 1 1 4.5 2.5c-1 .5-1.5 1.2-1.5 2" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  // 第一次辨識成功彈窗的慶祝感
  return (
    <svg {...baseProps} className={className}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M19 16l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7z" />
      <path d="M5 17l.5 1.3L6.7 19l-1.2.5L5 20.8 4.5 19.5 3.3 19l1.2-.5z" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M3 8h3.5l1.5-2h8l1.5 2H21v12H3z" />
      <circle cx="12" cy="13.5" r="3.8" />
    </svg>
  );
}

export function LightbulbIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.4c1 .9 1.4 2 1.4 3.6h5.2c0-1.6.4-2.7 1.4-3.6A6 6 0 0 0 12 3z" />
    </svg>
  );
}

export function TargetIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BoxIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M21 8l-9 4-9-4 9-4z" />
      <path d="M3 8v9l9 4 9-4V8" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function BlurIcon({ className }: IconProps) {
  // 「背景越單純越好」：虛線方框暗示「無雜物」
  return (
    <svg {...baseProps} className={className} strokeDasharray="3 3">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export function ZoomIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5l5 5" />
      <path d="M10.5 7.5v6" />
      <path d="M7.5 10.5h6" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M3 21h18" />
      <path d="M6 18V9" />
      <path d="M11 18V5" />
      <path d="M16 18v-7" />
      <path d="M21 18v-4" />
    </svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="9" rx="1.5" />
      <rect x="7" y="14" width="10" height="7" />
      <circle cx="17.5" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M10.5 18h3" />
    </svg>
  );
}

export function DesktopIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function FilmIcon({ className }: IconProps) {
  // 場記板（clapperboard）
  return (
    <svg {...baseProps} className={className}>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 9l2.5-4.5 4 1.5L8 9" />
      <path d="M8 9l4.5-3 4 1.5L15 9" />
      <path d="M15 9l4.5-3 1.5 3" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M5 12h13" />
      <path d="M12.5 5.5L19 12l-6.5 6.5" />
    </svg>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M12 5v13" />
      <path d="M5.5 12.5L12 19l6.5-6.5" />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M19 13v6.5H4.5V5H11" />
    </svg>
  );
}
