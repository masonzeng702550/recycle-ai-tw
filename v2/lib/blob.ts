import "server-only";
import { put } from "@vercel/blob";

// 把錯誤回報的圖檔上傳到 Vercel Blob。
// Store 是 private，所以這裡不傳 access；前端讀圖時必須走 /api/admin/blob-proxy
// 由 server 端帶 token 抓回再 stream，避免曝露 token 給瀏覽器。
export async function uploadErrorReportImage(
  file: Blob,
  originalName?: string,
): Promise<{ url: string; pathname: string }> {
  const ext = guessExt(file.type, originalName);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const pathname = `error-reports/${ts}-${rand}${ext}`;
  const result = await put(pathname, file, {
    access: "private",
    contentType: file.type || "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return { url: result.url, pathname: result.pathname };
}

// 環保冷知識的梗圖。public access — 辨識中畫面 + 限時動態 canvas 都需要
// 直接從瀏覽器拉，不能走 admin proxy。所以另起一個 path。
export async function uploadEcoFactMeme(
  file: Blob,
  originalName?: string,
): Promise<{ url: string; pathname: string }> {
  const ext = guessExt(file.type, originalName);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const pathname = `eco-facts/${ts}-${rand}${ext}`;
  const result = await put(pathname, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return { url: result.url, pathname: result.pathname };
}

function guessExt(mime: string, name?: string): string {
  if (name) {
    const m = name.match(/\.[a-zA-Z0-9]{2,5}$/);
    if (m) return m[0].toLowerCase();
  }
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("heic")) return ".heic";
  if (mime.includes("heif")) return ".heif";
  return ".jpg";
}
