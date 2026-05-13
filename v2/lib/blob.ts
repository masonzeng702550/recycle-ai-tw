import "server-only";
import { put } from "@vercel/blob";

// 把錯誤回報的圖檔上傳到 Vercel Blob，回傳公開 URL
export async function uploadErrorReportImage(
  file: Blob,
  originalName?: string,
): Promise<{ url: string; pathname: string }> {
  const ext = guessExt(file.type, originalName);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const pathname = `error-reports/${ts}-${rand}${ext}`;
  const result = await put(pathname, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
    addRandomSuffix: false,
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
