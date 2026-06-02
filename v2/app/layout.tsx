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

// 同步檢查 standalone + sessionStorage，並立刻在 <html> 加上 class。
// 必須在 body 內容渲染之前 inline 執行；因此用 <script> 直接塞在 body 最前。
// 用最短的代碼，所有狀態用 class toggle，動畫純 CSS：
//   - .pwa-splash-active 啟動 splash（CSS 把它顯示出來、跑進場動畫）
//   - 1000ms 後加 .pwa-splash-fading 啟動退場
//   - 1400ms 後拿掉兩個 class，splash 回到 display:none
const SPLASH_BOOT = `(function(){try{var s=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(s&&!sessionStorage.getItem('tf:pwaSplashShown')){sessionStorage.setItem('tf:pwaSplashShown','1');var d=document.documentElement;d.classList.add('pwa-splash-active');setTimeout(function(){d.classList.add('pwa-splash-fading');},1000);setTimeout(function(){d.classList.remove('pwa-splash-active','pwa-splash-fading');},1400);}}catch(e){}})();`;

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
        {/* 同步偵測 PWA standalone：必須在任何可見內容前執行 */}
        <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} />

        {/* 靜態 splash overlay：DOM 一定存在，CSS 控制顯示。
            放在 children 之前可以讓使用者第一眼看到的就是 splash，
            而不是先閃一下實際頁面。 */}
        <div id="pwa-splash" aria-hidden="true">
          <div className="pwa-splash-logo font-serif font-extrabold text-5xl sm:text-6xl leading-none select-none">
            <span style={{ color: "#00a96f" }}>T</span>
            rash
            <span style={{ color: "#fb9c00" }}>f</span>
            orm
          </div>
          <div className="pwa-splash-sub text-xs sm:text-sm text-neutral-500 font-mono tracking-[0.3em] uppercase select-none">
            Taiwan · Recycle · AI
          </div>
        </div>

        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
