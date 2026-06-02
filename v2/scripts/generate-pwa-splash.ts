// Render apple-touch-startup-image PNGs for iOS PWA.
// Without these, iOS shows the last-rendered screenshot of the PWA while it
// launches — which is exactly the "閃一下首頁" the user is seeing. With these,
// iOS shows our dark logo image instead and hands over to the webview where
// the same dark logo is already visible (no visual jump).
//
// Output: public/icons/splash/splash-<W>x<H>.png
// Run: npx tsx scripts/generate-pwa-splash.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons", "splash");
mkdirSync(OUT, { recursive: true });

const BG = "#0a0a0a";
const GREEN = "#00a96f";
const ORANGE = "#fb9c00";

// Apple-mandated device dimensions for apple-touch-startup-image.
// Format: [width_px, height_px, cssW, cssH, scale] — scale matters for
// the media query we'll emit in layout.tsx.
interface Spec {
  w: number;
  h: number;
  cssW: number;
  cssH: number;
  scale: number;
  label: string;
}

const SPECS: Spec[] = [
  // iPhones (portrait)
  { w: 1290, h: 2796, cssW: 430, cssH: 932, scale: 3, label: "iPhone 14/15 Pro Max" },
  { w: 1179, h: 2556, cssW: 393, cssH: 852, scale: 3, label: "iPhone 14/15 Pro" },
  { w: 1284, h: 2778, cssW: 428, cssH: 926, scale: 3, label: "iPhone 12/13 Pro Max" },
  { w: 1170, h: 2532, cssW: 390, cssH: 844, scale: 3, label: "iPhone 12/13/14" },
  { w: 1242, h: 2688, cssW: 414, cssH: 896, scale: 3, label: "iPhone XS Max / 11 Pro Max" },
  { w: 1125, h: 2436, cssW: 375, cssH: 812, scale: 3, label: "iPhone X / XS / 11 Pro" },
  { w: 828,  h: 1792, cssW: 414, cssH: 896, scale: 2, label: "iPhone XR / 11" },
  { w: 750,  h: 1334, cssW: 375, cssH: 667, scale: 2, label: "iPhone SE / 8 / 7" },
  // iPads (portrait)
  { w: 2048, h: 2732, cssW: 1024, cssH: 1366, scale: 2, label: "iPad Pro 12.9" },
  { w: 1668, h: 2388, cssW: 834,  cssH: 1194, scale: 2, label: "iPad Pro 11" },
  { w: 1668, h: 2224, cssW: 834,  cssH: 1112, scale: 2, label: "iPad Air 10.5" },
  { w: 1620, h: 2160, cssW: 810,  cssH: 1080, scale: 2, label: "iPad 10.2" },
  { w: 1536, h: 2048, cssW: 768,  cssH: 1024, scale: 2, label: "iPad mini / 9.7" },
];

function splashSvg(w: number, h: number): string {
  // Logo height ≈ 12% of shorter side, centered. Subtitle below.
  const shorter = Math.min(w, h);
  const fontSize = Math.round(shorter * 0.14);
  const subSize = Math.round(shorter * 0.025);
  const cx = w / 2;
  const cy = h / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}" />
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
        font-family="ui-serif, Georgia, 'Source Han Serif', 'Noto Serif TC', serif"
        font-weight="800" font-size="${fontSize}" letter-spacing="-3">
    <tspan fill="${GREEN}">T</tspan><tspan fill="#e5e5e5">rash</tspan><tspan fill="${ORANGE}">f</tspan><tspan fill="#e5e5e5">orm</tspan>
  </text>
  <text x="${cx}" y="${cy + fontSize * 0.85}" text-anchor="middle" dominant-baseline="middle"
        font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
        font-weight="400" font-size="${subSize}" letter-spacing="${subSize * 0.3}"
        fill="#737373">
    TAIWAN · RECYCLE · AI
  </text>
</svg>`;
}

async function main() {
  const links: string[] = [];
  for (const s of SPECS) {
    const svg = splashSvg(s.w, s.h);
    const out = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();
    const filename = `splash-${s.w}x${s.h}.png`;
    writeFileSync(join(OUT, filename), out);
    console.log(`✓ ${filename}  ${(out.byteLength / 1024).toFixed(1)} KB  (${s.label})`);

    // Build the media query string we'll consume from layout.tsx
    const media = `(device-width: ${s.cssW}px) and (device-height: ${s.cssH}px) and (-webkit-device-pixel-ratio: ${s.scale}) and (orientation: portrait)`;
    links.push(
      `  { rel: "apple-touch-startup-image", url: "/icons/splash/${filename}", media: \`${media}\` },`,
    );
  }
  console.log(`\nWrote ${SPECS.length} splash images.\n`);
  console.log("Paste into metadata.icons.other in app/layout.tsx:\n");
  console.log(links.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
