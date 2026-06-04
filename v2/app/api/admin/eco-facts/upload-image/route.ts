// Admin-only：上傳冷知識的梗圖到 public Vercel Blob，回傳可直接 <img src> 的 URL。
// 上傳前用 sharp 縮到 1080px JPEG q80，避免又胖又慢。
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { uploadEcoFactMeme } from "@/lib/blob";
import type { AdminEcoFactUploadResponse } from "@/lib/api-contracts";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_LONG_SIDE = 1080;
const JPEG_QUALITY = 80;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "缺少 image。" }, { status: 400 });
    }
    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "檔案不是圖片。" }, { status: 400 });
    }

    // sharp 處理：方向修正、縮小、轉 JPEG。GIF 動圖會被轉成靜態第一格，
    // 對「梗圖」用途來說可接受；要保留動態就另外處理。
    const buf = Buffer.from(await file.arrayBuffer());
    let out: Buffer;
    try {
      out = await sharp(buf, { failOn: "none" })
        .rotate()
        .resize({
          width: MAX_LONG_SIDE,
          height: MAX_LONG_SIDE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    } catch (e) {
      console.error("[eco-facts/upload-image] sharp failed", e);
      return NextResponse.json({ error: "圖片處理失敗。" }, { status: 400 });
    }

    const blob = new Blob([new Uint8Array(out)], { type: "image/jpeg" });
    const { url, pathname } = await uploadEcoFactMeme(blob, "meme.jpg");

    const body: AdminEcoFactUploadResponse = { url, pathname };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/admin/eco-facts/upload-image] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
