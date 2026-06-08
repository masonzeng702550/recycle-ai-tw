import { ImageResponse } from "next/og";

// 動態產生 /opengraph-image — 分享網址到 LINE / IG / Facebook / Twitter
// 時對方平台會抓這張顯示。1200×630 是 Facebook 建議尺寸。
export const runtime = "edge";
export const alt = "Trashform — AI 廢棄物辨識";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#00a96f";
const ORANGE = "#fb9c00";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-serif, Georgia, serif",
          color: "#f5f5f5",
          padding: 80,
          position: "relative",
        }}
      >
        {/* 上方角落淡漸層 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 200,
            background:
              "radial-gradient(ellipse at center top, rgba(0,169,111,0.15), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background:
              "radial-gradient(ellipse at center bottom, rgba(251,156,0,0.10), transparent 70%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            letterSpacing: -4,
            display: "flex",
            marginBottom: 30,
          }}
        >
          <span style={{ color: GREEN }}>T</span>
          <span>rash</span>
          <span style={{ color: ORANGE }}>f</span>
          <span>orm</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: "#a3a3a3",
            letterSpacing: 8,
            marginBottom: 60,
            display: "flex",
            fontFamily: "ui-monospace, Menlo, monospace",
          }}
        >
          TAIWAN · RECYCLE · AI
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: 1000,
            display: "flex",
          }}
        >
          拍照辨識廢棄物，立刻知道怎麼分類
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            fontSize: 24,
            color: "#737373",
            fontFamily: "ui-monospace, Menlo, monospace",
            display: "flex",
          }}
        >
          recycle-ai-tw.vercel.app · @trashform.team
        </div>
      </div>
    ),
    { ...size }
  );
}
