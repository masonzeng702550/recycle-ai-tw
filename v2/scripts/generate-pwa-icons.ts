// Render PWA + favicon icons from an SVG template using sharp.
// Output lives in public/icons/. Re-run if the design changes — committed
// PNGs are the source of truth for production.
//
// Run: npx tsx scripts/generate-pwa-icons.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import sharp from "sharp";

// fileURLToPath handles non-ASCII (e.g. Chinese) paths correctly.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

const GREEN = "#00a96f";
const ORANGE = "#fb9c00";
const BG_DARK = "#0a0a0a";

// "Tf" mark — green T + orange f, on dark background. Big bold sans-serif.
// We render it at SVG level so sharp can rasterise any size cleanly.
function markSvg(size: number, bg: string, padded: boolean) {
  const radius = padded ? Math.round(size * 0.22) : 0;
  // padded=true → maskable: keep mark inside the 80% safe zone
  const fontSize = padded ? Math.round(size * 0.42) : Math.round(size * 0.52);
  const y = padded ? Math.round(size * 0.62) : Math.round(size * 0.66);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${bg}" />
  <text x="50%" y="${y}" text-anchor="middle"
        font-family="ui-serif, Georgia, 'Source Han Serif', serif"
        font-weight="800" font-size="${fontSize}"
        letter-spacing="-2">
    <tspan fill="${GREEN}">T</tspan><tspan fill="${ORANGE}">f</tspan>
  </text>
</svg>`;
}

interface Target {
  filename: string;
  size: number;
  padded: boolean;
  bg?: string;
}

const TARGETS: Target[] = [
  // Standard PWA
  { filename: "icon-192.png", size: 192, padded: false },
  { filename: "icon-512.png", size: 512, padded: false },
  // Maskable (Android adaptive)
  { filename: "icon-192-maskable.png", size: 192, padded: true },
  { filename: "icon-512-maskable.png", size: 512, padded: true },
  // iOS home-screen
  { filename: "apple-touch-icon.png", size: 180, padded: false },
  // Favicons
  { filename: "favicon-32.png", size: 32, padded: false },
  { filename: "favicon-16.png", size: 16, padded: false },
];

async function main() {
  for (const t of TARGETS) {
    const svg = markSvg(t.size, t.bg ?? BG_DARK, t.padded);
    const out = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();
    const dest = join(OUT, t.filename);
    writeFileSync(dest, out);
    console.log(`✓ ${t.filename}  ${out.byteLength} bytes`);
  }
  console.log(`\nWrote ${TARGETS.length} icons to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
