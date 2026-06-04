// 本地產 10 張環保地獄梗 PNG → public/eco-memes/
// 用 sharp 把 SVG (含中文 <text>) rasterise。
// 本機（macOS / Linux 有 CJK 字體）跑得起來；Vercel serverless 沒中文字所以
// 不適合 server-side 渲。產出的 PNG 直接 commit 進 repo 由 Next 當 static 服務。
//
// 跑法：cd v2 && npx tsx scripts/generate-eco-memes.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { ECO_MEME_SEEDS, type EcoMemeSeed } from "../lib/eco-meme-seeds";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "eco-memes");
mkdirSync(OUT, { recursive: true });

const SIZE = 1080;
const BG = "#0a0a0a";
const WHITE = "#f5f5f5";
const GREEN = "#00a96f";
const ORANGE = "#fb9c00";
const MUTED = "#737373";
const PANEL_BORDER = "rgba(255,255,255,0.06)";

// 字型 fallback：macOS 走 PingFang，Linux 走 Noto Sans CJK；最後落到 sans-serif。
const SANS =
  '"PingFang TC", "Hiragino Sans CNS", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif';
const SERIF =
  '"Noto Serif TC", "Source Han Serif TC", "Songti TC", Georgia, serif';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(seed: EcoMemeSeed): string {
  // 排版：標頭 + 中央梗文 + 底部 wordmark / handle
  const labelY = 130;
  const wordmarkY = 980;
  const handleY = 1030;

  // 可用內容區
  const contentTop = 220;
  const contentBottom = 900;
  const availableH = contentBottom - contentTop;

  // 找出「最後一個非空行」當作 punchline，給高亮色
  const lastIdx = (() => {
    for (let i = seed.lines.length - 1; i >= 0; i--) {
      if (seed.lines[i] !== "") return i;
    }
    return -1;
  })();

  // 行數越多字越小
  const nonEmptyCount = seed.lines.filter((l) => l !== "").length;
  const baseFontSize = nonEmptyCount <= 4 ? 70 : nonEmptyCount <= 6 ? 58 : 50;
  const lineHeight = Math.round(baseFontSize * 1.32);
  const spacerHeight = Math.round(baseFontSize * 0.65);

  // 算每一行的 y 偏移（從上開始累加）
  const offsets: number[] = [];
  let cum = 0;
  for (const line of seed.lines) {
    offsets.push(cum);
    cum += line === "" ? spacerHeight : lineHeight;
  }
  const totalH = cum;
  // 垂直置中
  const startY =
    contentTop + Math.max(0, (availableH - totalH) / 2) + baseFontSize * 0.8;

  const linesSvg = seed.lines
    .map((line, i) => {
      if (line === "") return "";
      const y = Math.round(startY + offsets[i]);
      const isPunchline = i === lastIdx;
      const color = isPunchline ? ORANGE : WHITE;
      const weight = isPunchline ? 900 : 800;
      return `<text x="${SIZE / 2}" y="${y}" text-anchor="middle" fill="${color}" font-family='${SANS}' font-size="${baseFontSize}" font-weight="${weight}" letter-spacing="-1">${escapeXml(
        line,
      )}</text>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg-top" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg-bot" cx="50%" cy="100%" r="70%">
      <stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="100%" height="100%" fill="${BG}"/>
  <rect width="100%" height="100%" fill="url(#bg-top)"/>
  <rect width="100%" height="100%" fill="url(#bg-bot)"/>

  <text x="${SIZE / 2}" y="${labelY}" text-anchor="middle" fill="${ORANGE}" font-family='${SANS}' font-size="36" font-weight="800" letter-spacing="4">💀 環保地獄梗</text>

  <line x1="380" y1="170" x2="700" y2="170" stroke="${PANEL_BORDER}" stroke-width="1"/>

  ${linesSvg}

  <line x1="120" y1="930" x2="${SIZE - 120}" y2="930" stroke="${PANEL_BORDER}" stroke-width="1"/>

  <text x="${SIZE / 2}" y="${wordmarkY}" text-anchor="middle" font-family='${SERIF}' font-size="52" font-weight="800" letter-spacing="-1"><tspan fill="${GREEN}">T</tspan><tspan fill="${WHITE}">rash</tspan><tspan fill="${ORANGE}">f</tspan><tspan fill="${WHITE}">orm</tspan></text>

  <text x="${SIZE / 2}" y="${handleY}" text-anchor="middle" fill="${MUTED}" font-family='${SANS}' font-size="22" font-weight="500" letter-spacing="2">@trashform.team · recycle-ai-tw.vercel.app</text>
</svg>`;
}

async function main() {
  for (const seed of ECO_MEME_SEEDS) {
    const svg = buildSvg(seed);
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const out = join(OUT, `${seed.filename}.png`);
    writeFileSync(out, png);
    console.log(`✓ ${seed.filename}.png  ${(png.byteLength / 1024).toFixed(1)} KB`);
  }
  console.log(`\nWrote ${ECO_MEME_SEEDS.length} memes to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
