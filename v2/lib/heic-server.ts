// Server-side HEIC fallback：客戶端轉檔失敗時，這裡再試一次。
// 使用 heic-convert（純 JS + WASM），動態 import 避免冷啟動時間。

import "server-only";

export interface HeicNormalised {
  blob: Blob;
  filename: string;
  converted: boolean;
}

function looksLikeHeic(blob: Blob, name?: string): boolean {
  if (/image\/(heic|heif)/i.test(blob.type)) return true;
  if (name && /\.(heic|heif)$/i.test(name)) return true;
  return false;
}

export async function ensureGeminiSafeImage(
  blob: Blob,
  origName?: string,
): Promise<HeicNormalised> {
  const safeName = origName ?? `upload-${Date.now()}.bin`;
  if (!looksLikeHeic(blob, origName)) {
    return { blob, filename: safeName, converted: false };
  }

  try {
    const mod = await import("heic-convert");
    const heicConvert = mod.default;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const jpegBuffer = await heicConvert({
      buffer,
      format: "JPEG",
      quality: 0.9,
    });
    const jpegBlob = new Blob([new Uint8Array(jpegBuffer)], {
      type: "image/jpeg",
    });
    const newName = safeName.replace(/\.(heic|heif)$/i, ".jpg");
    return { blob: jpegBlob, filename: newName, converted: true };
  } catch (e) {
    console.error("[heic-server] convert failed, sending original", e);
    return { blob, filename: safeName, converted: false };
  }
}
