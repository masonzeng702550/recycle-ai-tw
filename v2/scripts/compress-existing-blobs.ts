// One-shot migration: re-encode every error-reports/ blob with sharp.
// Run: vercel env pull .env.production.local && \
//      set -a && . ./.env.production.local && set +a && \
//      npx tsx scripts/compress-existing-blobs.ts
//
// Behaviour:
//  - Lists every blob under error-reports/
//  - Downloads each, compresses (1600px / JPEG q75), uploads back to the SAME
//    pathname with allowOverwrite:true → URL stays stable, DB needs no update.
//  - Skips files where the recompressed output is not smaller.
//  - Prints per-file savings + grand total at the end.
//
// We force content-type=image/jpeg even if the pathname ends in .png/.heic —
// the blob proxy serves by the stored contentType, not extension.

import { get, list, put } from "@vercel/blob";
import sharp from "sharp";

const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 75;
const PREFIX = "error-reports/";

async function fetchBlob(pathname: string, fallbackUrl: string): Promise<Buffer> {
  // Private store: prefer get() so we always use the SDK token
  try {
    const g = await get(pathname, { access: "private" });
    if (g?.stream) {
      const chunks: Buffer[] = [];
      const reader = g.stream.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks);
    }
  } catch {
    // fall through to direct URL
  }
  const res = await fetch(fallbackUrl);
  if (!res.ok) throw new Error(`fetch ${fallbackUrl}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function recompress(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_LONG_SIDE,
      height: MAX_LONG_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

function mb(n: number): string {
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  let cursor: string | undefined = undefined;
  const targets: { pathname: string; url: string; size: number }[] = [];
  do {
    const res: Awaited<ReturnType<typeof list>> = await list({
      prefix: PREFIX,
      cursor,
      limit: 1000,
    });
    for (const b of res.blobs) {
      targets.push({ pathname: b.pathname, url: b.url, size: b.size });
    }
    cursor = res.cursor;
  } while (cursor);

  console.log(`Found ${targets.length} blobs under ${PREFIX}`);
  let origTotal = 0;
  let newTotal = 0;
  let touched = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    origTotal += t.size;
    const prefix = `[${i + 1}/${targets.length}] ${t.pathname}`;
    try {
      const original = await fetchBlob(t.pathname, t.url);
      let recompressed: Buffer;
      try {
        recompressed = await recompress(original);
      } catch (e) {
        console.log(`${prefix}  decode-failed, skipping (${(e as Error).message})`);
        newTotal += t.size;
        failed += 1;
        continue;
      }

      if (recompressed.byteLength >= original.byteLength) {
        console.log(
          `${prefix}  ${mb(t.size)} → ${mb(recompressed.byteLength)}  (already small, skipping)`,
        );
        newTotal += t.size;
        skipped += 1;
        continue;
      }

      await put(t.pathname, recompressed, {
        access: "private",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      console.log(
        `${prefix}  ${mb(t.size)} → ${mb(recompressed.byteLength)}  saved ${mb(t.size - recompressed.byteLength)}`,
      );
      newTotal += recompressed.byteLength;
      touched += 1;
    } catch (e) {
      console.error(`${prefix}  FAILED: ${(e as Error).message}`);
      newTotal += t.size;
      failed += 1;
    }
  }

  console.log("");
  console.log("=== summary ===");
  console.log(`compressed: ${touched}`);
  console.log(`skipped (already small): ${skipped}`);
  console.log(`failed: ${failed}`);
  console.log(`before: ${mb(origTotal)} (${origTotal} bytes)`);
  console.log(`after : ${mb(newTotal)} (${newTotal} bytes)`);
  console.log(
    `saved : ${mb(origTotal - newTotal)} (${(((origTotal - newTotal) / Math.max(origTotal, 1)) * 100).toFixed(1)}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
