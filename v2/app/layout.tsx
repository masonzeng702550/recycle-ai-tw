import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trashform v2 — 台灣資源回收 AI 小幫手",
  description:
    "拍下身邊的廢棄物，AI 立即告訴你在臺北市或高雄市該怎麼處理。",
  // app/manifest.ts 會自動產生 link rel="manifest"，這裡只補圖示
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trashform",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        // 全站留 iOS PWA 安全區（home indicator / 鏡頭橫向 inset）。
        // 頂端 inset 由各 sticky header 自己加，避免雙重 padding。
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
