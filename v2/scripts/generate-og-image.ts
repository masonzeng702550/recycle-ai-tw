// Render a static 1200×630 OpenGraph card using sharp.
// Output goes to public/og-image.png and is referenced by both
// the Twitter card and openGraph metadata in app/layout.tsx.
//
// Run:  npx tsx scripts/generate-og-image.ts
//
// Why static? next/og's Edge Function bundle is 1.06 MB, which is
// 60 KB over Vercel's Hobby-plan Edge Function cap. A pre-rendered
// PNG avoids the function entirely and is also faster for crawlers.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "og-image.png");
mkdirSync(dirname(OUT), { recursive: true });

const W = 1200;
const H = 630;

function svg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- background -->
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>

  <!-- top + bottom brand accent bars -->
  <rect x="0" y="0" width="${W}" height="8" fill="url(#grad-tb)"/>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="url(#grad-bt)"/>

  <defs>
    <linearGradient id="grad-tb" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0%" stop-color="#00a96f"/>
      <stop offset="100%" stop-color="#fb9c00"/>
    </linearGradient>
    <linearGradient id="grad-bt" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0%" stop-color="#fb9c00"/>
      <stop offset="100%" stop-color="#00a96f"/>
    </linearGradient>
  </defs>

  <!-- Wordmark：Trashform，T 綠 / f 橘 -->
  <text x="${W / 2}" y="270" text-anchor="middle"
        font-family="'PingFang TC','Microsoft JhengHei','Noto Serif TC',Georgia,serif"
        font-weight="900" font-size="180" letter-spacing="-6">
    <tspan fill="#00a96f">T</tspan><tspan fill="#f5f5f5">rash</tspan><tspan fill="#fb9c00">f</tspan><tspan fill="#f5f5f5">orm</tspan>
  </text>

  <!-- Subtitle -->
  <text x="${W / 2}" y="335" text-anchor="middle"
        font-family="ui-monospace,'SF Mono',Menlo,monospace"
        font-size="36" letter-spacing="12" fill="#a3a3a3">
    TAIWAN · RECYCLE · AI
  </text>

  <!-- Tagline (Chinese — system font fallback chain) -->
  <text x="${W / 2}" y="450" text-anchor="middle"
        font-family="'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif"
        font-weight="700" font-size="58" fill="#ffffff">
    拍照辨識廢棄物，立刻知道怎麼分類
  </text>

  <!-- Footer URL + IG handle -->
  <text x="${W / 2}" y="565" text-anchor="middle"
        font-family="ui-monospace,'SF Mono',Menlo,monospace"
        font-size="26" fill="#737373">
    recycle-ai-tw.vercel.app · @trashform.team
  </text>
</svg>`;
}

async function main() {
  const png = await sharp(Buffer.from(svg()))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(OUT, png);
  console.log(`✓ wrote ${OUT}  ${(png.byteLength / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
