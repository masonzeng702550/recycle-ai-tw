"use client";

// IG 限時動態模板（1080 × 1920）— 用 Canvas 動態繪製。
// 純客戶端、不需要 server round-trip。產出 File，交給 navigator.share。
//
// 字型策略：所有文字都用 sans-serif 系統字體 fallback chain，避免
// Noto Serif TC 還沒從 Google Fonts 載完造成 tofu。Logo 部分仍指定
// "Noto Serif TC" 作首選；先 await document.fonts.ready 拉一下保險。

const W = 1080;
const H = 1920;

const BG = "#0a0a0a";
const PANEL = "#171717";
const BORDER = "#262626";
const TEXT = "#f5f5f5";
const DIM = "#a3a3a3";
const MUTED = "#737373";
const GREEN = "#00a96f";
const ORANGE = "#fb9c00";
const AMBER = "#fbbf24";

const SANS =
  '"PingFang TC", "Hiragino Sans CNS", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif';
const SERIF =
  '"Noto Serif TC", "Source Han Serif TC", "Songti TC", Georgia, serif';
const MONO =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Source Code Pro", monospace';

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.textBaseline = "top";
  return { canvas, ctx };
}

function fillBackground(ctx: CanvasRenderingContext2D) {
  // 主背景
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  // 上下兩塊極淡的徑向漸層做點氛圍
  const top = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 900);
  top.addColorStop(0, "rgba(0, 169, 111, 0.10)");
  top.addColorStop(1, "rgba(0, 169, 111, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 900);
  const bot = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 900);
  bot.addColorStop(0, "rgba(251, 156, 0, 0.08)");
  bot.addColorStop(1, "rgba(251, 156, 0, 0)");
  ctx.fillStyle = bot;
  ctx.fillRect(0, H - 900, W, 900);
}

// 畫品牌 logo「Trashform」— T 綠 + f 橘，其他白
function drawWordmark(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `800 110px ${SERIF}`;
  // 因為 canvas 不支援 tspan 樣式，要手動分段量測 + 上色
  const parts: { text: string; color: string }[] = [
    { text: "T", color: GREEN },
    { text: "rash", color: TEXT },
    { text: "f", color: ORANGE },
    { text: "orm", color: TEXT },
  ];
  const widths = parts.map((p) => ctx.measureText(p.text).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = (W - total) / 2;
  ctx.textAlign = "left";
  for (let i = 0; i < parts.length; i++) {
    ctx.fillStyle = parts[i].color;
    ctx.fillText(parts[i].text, x, y);
    x += widths[i];
  }
  ctx.restore();
}

function drawSubtitle(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = `500 30px ${MONO}`;
  // letter-spacing for canvas: 自己手動 spacing
  const text = "TAIWAN · RECYCLE · AI";
  const chars = text.split("");
  const tracking = 6;
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = (W - total) / 2;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + tracking;
  }
  ctx.restore();
}

// 簡易 CJK / 英文混排換行：以字元為單位試貼，超寬就斷。
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(current);
      current = "";
      continue;
    }
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  maxLines = Infinity,
) {
  const slice = lines.slice(0, maxLines);
  for (let i = 0; i < slice.length; i++) {
    ctx.fillText(slice[i], x, y + i * lineHeight);
  }
  return y + slice.length * lineHeight;
}

// Footer 預留高度（從 H 往上）
const FOOTER_RESERVE = 320;

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.textAlign = "center";

  // 分隔線
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, H - FOOTER_RESERVE);
  ctx.lineTo(W - 120, H - FOOTER_RESERVE);
  ctx.stroke();

  // CTA
  ctx.fillStyle = TEXT;
  ctx.font = `700 36px ${SANS}`;
  ctx.fillText("用 AI 辨識廢棄物怎麼分類", W / 2, H - 280);

  // URL pill：白底圓角，視覺像個按鈕；網址用 mono 大字
  const urlText = "recycle-ai-tw.vercel.app";
  ctx.font = `700 30px ${MONO}`;
  const urlW = ctx.measureText(urlText).width;
  const pillH = 68;
  const pillW = urlW + 64 + 56;
  const pillX = (W - pillW) / 2;
  const pillY = H - 210;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = `400 32px ${SANS}`;
  ctx.fillText("🔗", pillX + 24, pillY + 16);
  ctx.font = `700 30px ${MONO}`;
  ctx.fillText(urlText, pillX + 72, pillY + 18);
  ctx.textAlign = "center";

  // IG 標記 — 橘色凸顯，使用者更容易記住
  ctx.fillStyle = ORANGE;
  ctx.font = `800 36px ${SANS}`;
  ctx.fillText("@trashform.team", W / 2, H - 108);

  ctx.fillStyle = MUTED;
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText("追蹤我們，看更多回收 / 環保資訊", W / 2, H - 58);
  ctx.restore();
}

async function exportAsFile(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("canvas.toBlob failed");
  return new File([blob], filename, { type: "image/png" });
}

async function waitFontsReady(): Promise<void> {
  if (typeof document === "undefined") return;
  if (!("fonts" in document)) return;
  try {
    await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts
      .ready;
  } catch {
    // 不擋流程
  }
}

// ─── 環保冷知識限時動態 ─────────────────────────────────
// 兩種版面：
//   - 純文字：logo / label / 大字本文 / footer
//   - 帶梗圖：logo / label / 梗圖（contain in box）/ 較小本文 / footer
export interface EcoFactStoryInput {
  content: string;
  imageUrl?: string | null;
}

export async function renderEcoFactStory(
  input: EcoFactStoryInput | string,
): Promise<File> {
  // 相容舊呼叫端：以前傳純字串
  const data: EcoFactStoryInput =
    typeof input === "string" ? { content: input, imageUrl: null } : input;

  await waitFontsReady();
  const { canvas, ctx } = makeCanvas();
  fillBackground(ctx);

  drawWordmark(ctx, 180);
  drawSubtitle(ctx, 320);

  // 中央 label
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN;
  ctx.font = `700 52px ${SANS}`;
  ctx.fillText("💡 環保冷知識", W / 2, 540);
  ctx.restore();

  // 帶梗圖時把圖置入畫布上半部
  const memeImg = data.imageUrl ? await loadImage(data.imageUrl) : null;
  let textTop: number;

  if (memeImg) {
    // 梗圖框（contain）：固定外框，圖片等比縮放置中
    const boxX = 120;
    const boxY = 620;
    const boxW = W - 240;
    const boxH = 760; // 預留下方放本文 + footer
    // 圓角剪裁
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 36);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.clip();
    // 縮放比例
    const scale = Math.min(boxW / memeImg.width, boxH / memeImg.height);
    const drawW = memeImg.width * scale;
    const drawH = memeImg.height * scale;
    const dx = boxX + (boxW - drawW) / 2;
    const dy = boxY + (boxH - drawH) / 2;
    ctx.drawImage(memeImg, dx, dy, drawW, drawH);
    ctx.restore();
    // 邊框
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 36);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    textTop = boxY + boxH + 40;
  } else {
    // 沒梗圖：本文起始位置往上提，畫面才不會空蕩
    textTop = 700;
  }

  // 冷知識本文
  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = TEXT;
  // 有圖時字級略小，因為剩餘空間有限
  const bodyFont = memeImg ? `500 44px ${SANS}` : `500 58px ${SANS}`;
  const lineHeight = memeImg ? 68 : 88;
  const maxLines = memeImg ? 3 : 8;
  ctx.font = bodyFont;
  const maxWidth = W - 240;
  const wrapped = wrapText(ctx, data.content, maxWidth);
  const lines =
    wrapped.length <= maxLines
      ? wrapped
      : [...wrapped.slice(0, maxLines - 1), `${wrapped[maxLines - 1]}…`];

  const blockHeight = lines.length * lineHeight;
  const maxBottom = H - FOOTER_RESERVE - 40;
  // 沒梗圖時居中；有梗圖時直接從 textTop 起
  const startY = memeImg
    ? Math.min(textTop, maxBottom - blockHeight)
    : Math.min(
        Math.max(textTop, (H - blockHeight) / 2 - 120),
        maxBottom - blockHeight,
      );

  for (let i = 0; i < lines.length; i++) {
    const w = ctx.measureText(lines[i]).width;
    ctx.fillText(lines[i], (W - w) / 2, startY + i * lineHeight);
  }
  ctx.restore();

  // 沒梗圖時加左側引用線；有梗圖就省略避免太雜
  if (!memeImg) {
    ctx.save();
    ctx.fillStyle = GREEN;
    ctx.fillRect(120, startY, 6, blockHeight);
    ctx.restore();
  }

  drawFooter(ctx);
  return exportAsFile(canvas, "trashform-eco-fact.png");
}

// 載入跨來源圖片到 canvas，可能失敗（CORS 拒絕等），失敗 return null。
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("[story-image] meme load failed", url);
      resolve(null);
    };
    img.src = url;
  });
}

// ─── 辨識結果限時動態 ───────────────────────────────────
export interface ResultStoryInput {
  itemEmoji: string;
  itemName: string;
  groupLabel: string;
  cityName: string;
  disposal: string;
  binColor?: string | null;
  composite?: boolean;
}

export async function renderResultStory(r: ResultStoryInput): Promise<File> {
  await waitFontsReady();
  const { canvas, ctx } = makeCanvas();
  fillBackground(ctx);

  drawWordmark(ctx, 180);
  drawSubtitle(ctx, 320);

  // 「✓ 辨識完成」標籤
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN;
  ctx.font = `700 44px ${SANS}`;
  ctx.fillText("✓ 辨識完成", W / 2, 510);
  ctx.restore();

  // emoji + 物品名稱（最大字級）
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = TEXT;
  ctx.font = `400 120px ${SANS}`;
  ctx.fillText(r.itemEmoji, W / 2, 580);

  ctx.font = `800 92px ${SANS}`;
  // 物品名稱可能很長，做寬度截斷 / 換行
  ctx.textAlign = "left";
  const nameLines = wrapText(ctx, r.itemName, W - 200);
  const nameLh = 110;
  let ny = 730;
  for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
    const line = nameLines[i];
    const w = ctx.measureText(line).width;
    ctx.fillText(line, (W - w) / 2, ny + i * nameLh);
  }
  const afterName = ny + Math.min(nameLines.length, 2) * nameLh + 20;
  ctx.restore();

  // group chip + composite badge
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = DIM;
  ctx.font = `500 36px ${SANS}`;
  const groupText = r.composite
    ? `${r.groupLabel} · 複合材質`
    : r.groupLabel;
  ctx.fillText(groupText, W / 2, afterName);
  ctx.restore();

  // ─── 處理方式面板 ──────────────────
  // 上邊界：跟在 group chip 後面、但別貼太緊；
  // 下邊界：不可侵入 footer 區（H - FOOTER_RESERVE - 40 留 40px 緩衝）
  const panelLeft = 90;
  const panelRight = W - 90;
  const panelWidth = panelRight - panelLeft;
  const panelInner = panelWidth - 80;

  // 計算 panel 高度（disposal 換行，最多 3 行避免超出 footer）
  ctx.save();
  ctx.font = `500 46px ${SANS}`;
  const disposalLines = wrapText(ctx, r.disposal, panelInner).slice(0, 3);
  const disposalLh = 66;
  const disposalH = disposalLines.length * disposalLh;
  ctx.restore();

  const cityH = 56;
  const binH = r.binColor ? 100 : 0;
  const panelPadV = 40;
  const panelHeight = panelPadV * 2 + cityH + 24 + disposalH + binH;

  // panelTop 從理想位置開始，但不能讓底部超過 footer 預留線
  const idealPanelTop = Math.max(afterName + 80, 1080);
  const maxPanelTop = H - FOOTER_RESERVE - 40 - panelHeight;
  const panelTop = Math.min(idealPanelTop, maxPanelTop);

  // panel 背景
  ctx.save();
  roundRect(ctx, panelLeft, panelTop, panelWidth, panelHeight, 36);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 城市標籤
  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = AMBER;
  ctx.font = `700 36px ${SANS}`;
  ctx.fillText(`📍 ${r.cityName} · 處理方式`, panelLeft + 48, panelTop + panelPadV);
  ctx.restore();

  // 處理方式本文（字級 / 行高與 panel 高度計算保持一致）
  ctx.save();
  ctx.fillStyle = TEXT;
  ctx.font = `500 46px ${SANS}`;
  const dispY = panelTop + panelPadV + cityH + 24;
  drawLines(ctx, disposalLines, panelLeft + 48, dispY, disposalLh);
  ctx.restore();

  // 投入桶
  if (r.binColor) {
    const binY = dispY + disposalH + 12;
    ctx.save();
    ctx.fillStyle = GREEN;
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText("🗑️", panelLeft + 48, binY);
    ctx.fillStyle = DIM;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText("投入", panelLeft + 120, binY + 2);
    ctx.fillStyle = TEXT;
    ctx.font = `700 46px ${SANS}`;
    ctx.fillText(r.binColor, panelLeft + 120, binY + 38);
    ctx.restore();
  }

  drawFooter(ctx);
  return exportAsFile(canvas, "trashform-result.png");
}

// 圓角矩形 helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
