"use client";

// 在瀏覽器端把上傳圖：
//   1. HEIC → JPEG（iOS 預設拍照格式，Gemini 不認，瀏覽器 canvas 也無法 decode）
//   2. 縮到 maxLongSide 以內，避開 Vercel serverless 4.5 MB body 上限
// 兩段任一步失敗都 fallback 回原檔，server 端再做最後嘗試。

export interface ResizeOptions {
  maxLongSide?: number;
  quality?: number;
  // 原檔小於這個 byte 數且非 HEIC 就直接 pass-through
  skipBelow?: number;
}

const DEFAULTS: Required<ResizeOptions> = {
  maxLongSide: 2560,
  quality: 0.9,
  skipBelow: 2 * 1024 * 1024,
};

function isHeic(file: File): boolean {
  return (
    /image\/(heic|heif)/i.test(file.type) ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

async function convertHeicToJpeg(file: File, quality: number): Promise<File> {
  // dynamic import：heic2any 含 WASM ~3MB，只在真的拿到 HEIC 時才載入
  const mod = await import("heic2any");
  const heic2any = mod.default;
  const out = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality,
  });
  const jpegBlob = Array.isArray(out) ? out[0] : out;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
  return new File([jpegBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function maybeResizeImage(
  file: File,
  opts: ResizeOptions = {},
): Promise<File> {
  const o = { ...DEFAULTS, ...opts };

  // ── 第 1 段：HEIC → JPEG ──
  let working = file;
  if (isHeic(file)) {
    try {
      working = await convertHeicToJpeg(file, o.quality);
    } catch (e) {
      console.warn("[image-resize] HEIC convert failed, sending original", e);
      // 原檔丟給 server，後端再試一次
      return file;
    }
  } else if (file.size <= o.skipBelow) {
    // 非 HEIC 又夠小，省下 canvas 工
    return file;
  }

  // ── 第 2 段：縮圖（避開 4.5 MB body 上限）──
  const url = URL.createObjectURL(working);
  try {
    const img = await loadImage(url);
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    if (long <= o.maxLongSide && working.size <= o.skipBelow) {
      return working;
    }
    const scale = Math.min(1, o.maxLongSide / long);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return working;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", o.quality),
    );
    if (!blob) return working;

    const baseName = working.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return working;
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
