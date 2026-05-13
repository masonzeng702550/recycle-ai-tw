"use client";

// 在瀏覽器端把上傳圖縮到 maxLongSide，避免被 Vercel 的 4.5 MB body 上限擋掉。
// HEIC 等瀏覽器無法 decode 的格式會原檔回傳；上傳成功與否由後端決定。

export interface ResizeOptions {
  maxLongSide?: number;
  quality?: number;
  // 若原檔小於這個 byte 數就直接 pass-through，不浪費 CPU
  skipBelow?: number;
}

const DEFAULTS: Required<ResizeOptions> = {
  maxLongSide: 2560,
  quality: 0.9,
  skipBelow: 2 * 1024 * 1024,
};

export async function maybeResizeImage(
  file: File,
  opts: ResizeOptions = {},
): Promise<File> {
  const o = { ...DEFAULTS, ...opts };
  if (file.size <= o.skipBelow) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    if (long <= o.maxLongSide) return file;

    const scale = o.maxLongSide / long;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", o.quality),
    );
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // HEIC 或其他無法 decode 的格式 — 原檔回傳讓後端決定
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = src;
  });
}
