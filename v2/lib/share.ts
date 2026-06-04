"use client";

// 分享工具：限時動態（圖片）走 Web Share Level 2，LINE 走 URL scheme。
// 桌機沒裝置呼叫 IG / LINE，預設整組分享 UI 不顯示，由元件用
// useIsMobileShareable() 取得是否該渲染。

export const SITE_URL = "https://recycle-ai-tw.vercel.app";
export const IG_HANDLE = "@trashform.team";
export const IG_URL = "https://www.instagram.com/trashform.team/";

// 把網址寫到剪貼簿。Web Share 把圖丟去 IG 後，使用者只要在 IG 內按
// 「連結貼紙」貼上就能附上可點連結。失敗時 return false，由呼叫端
// 視情況顯示提示。
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// 是否在「能用分享 API 的行動裝置」上。
// 同時檢查 navigator.share + 觸控指標，避免桌機 Chrome 偽行動模式顯示。
export function isShareCapable(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;
  if (!("share" in navigator)) return false;
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  return true;
}

// 是否能分享附帶檔案（Web Share Level 2）。
// 用一個空 dummy File 做 feature-detect — 比 'canShare' in navigator 嚴謹。
export function canShareFiles(): boolean {
  if (!isShareCapable()) return false;
  if (!("canShare" in navigator)) return false;
  try {
    const probe = new File([new Uint8Array(0)], "probe.png", {
      type: "image/png",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

// 把一個 File 丟進原生分享面板。使用者再從面板挑 Instagram → Story。
// 取消（AbortError）視為使用者刻意關閉，不 throw。
export async function shareImageFile(
  file: File,
  fallbackText?: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canShareFiles()) return "unsupported";
  try {
    await navigator.share({
      files: [file],
      // text 是 IG 不會用、但 LINE / Messages 等會帶到的 fallback
      text: fallbackText,
      title: "Trashform",
    });
    return "shared";
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "AbortError" || err.name === "NotAllowedError")
    ) {
      return "cancelled";
    }
    throw err;
  }
}

// LINE：用官方 message-text web link。手機上會直接喚醒 LINE app
// 並把整段文字放到「選擇聊天」流程裡。
export function shareToLine(text: string, url?: string): void {
  const body = url ? `${text}\n${url}` : text;
  const target = `https://line.me/R/msg/text/?${encodeURIComponent(body)}`;
  // 用 location.href 取代 window.open：手機 universal link 比 popup 友善
  window.location.href = target;
}

// 訊息模板 ──────────────────────────────────────────
// 給 LINE / 其他純文字分享通道用。

export function ecoFactMessage(fact: string): string {
  return `🌱 環保冷知識\n${fact}\n\n— 來自 Trashform 廢棄物 AI 辨識\n試試看：`;
}

export interface ResultMessageInput {
  itemName: string;
  groupLabel: string;
  cityName: string;
  disposal: string;
  binColor?: string | null;
  composite?: boolean;
}

export function resultMessage(r: ResultMessageInput): string {
  const lines = [
    `🗑️ Trashform 辨識結果`,
    ``,
    `📦 物品：${r.itemName}（${r.groupLabel}${r.composite ? " · 複合材質" : ""}）`,
    `📍 ${r.cityName}：${r.disposal}`,
  ];
  if (r.binColor) lines.push(`🪣 投入：${r.binColor}`);
  lines.push("", "用 AI 看廢棄物怎麼分類：");
  return lines.join("\n");
}
