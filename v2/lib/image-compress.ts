// Server-side image compression for error-report uploads.
// Uses sharp; resizes to max 1600px long side and re-encodes as JPEG q75.
// We always emit JPEG so existing .png/.heic blobs converge to a single small
// format on the way in. Pathname / extension is left to the caller — see
// uploadErrorReportImage in lib/blob.ts.
//
// Falls back to the original blob if sharp can't decode it (rare; we already
// HEIC-fallback upstream via lib/heic-server.ts so this only fires for truly
// broken inputs).

import "server-only";
import sharp from "sharp";

const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 75;

export interface CompressedImage {
  blob: Blob;
  // The caller decides the pathname; we just guarantee a .jpg extension is
  // appropriate by always returning image/jpeg.
  extHint: ".jpg";
  originalBytes: number;
  compressedBytes: number;
}

export async function compressForStorage(
  input: Blob,
): Promise<CompressedImage> {
  const originalBytes = input.size;
  const buf = Buffer.from(await input.arrayBuffer());

  try {
    const out = await sharp(buf, { failOn: "none" })
      .rotate() // honour EXIF orientation
      .resize({
        width: MAX_LONG_SIDE,
        height: MAX_LONG_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    // If for some reason the "compressed" version got bigger, keep original
    if (out.byteLength >= originalBytes) {
      return {
        blob: new Blob([buf], { type: input.type || "image/jpeg" }),
        extHint: ".jpg",
        originalBytes,
        compressedBytes: originalBytes,
      };
    }

    return {
      blob: new Blob([new Uint8Array(out)], { type: "image/jpeg" }),
      extHint: ".jpg",
      originalBytes,
      compressedBytes: out.byteLength,
    };
  } catch (err) {
    console.error("[image-compress] sharp failed, keeping original", err);
    return {
      blob: input,
      extHint: ".jpg",
      originalBytes,
      compressedBytes: originalBytes,
    };
  }
}
