import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SITE, absoluteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.fullTitle,
    template: SITE.titleTemplate,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  authors: [{ name: "Trashform Team", url: SITE.url }],
  creator: "Trashform Team",
  publisher: "Trashform Team",
  category: "education",
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.fullTitle,
    description: SITE.description,
    images: [
      {
        url: absoluteUrl("/og-image.png"),
        width: 1200,
        height: 630,
        alt: "Trashform — 拍照辨識廢棄物",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.fullTitle,
    description: SITE.shortDescription,
    images: [absoluteUrl("/og-image.png")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // app/manifest.ts 會自動產生 link rel="manifest"，這裡只補圖示
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    // apple-touch-startup-image：iOS PWA 啟動時用這張取代上次螢幕截圖，
    // 解決「閃一下首頁才出現 splash」的問題。每個尺寸對應特定機型，
    // media query 要精確匹配 iOS 才會使用。檔案來自 scripts/generate-pwa-splash.ts。
    other: [
      // iPhones (portrait)
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      // iPads (portrait)
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1668x2224.png", media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1620x2160.png", media: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", url: "/icons/splash/splash-1536x2048.png", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
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

// JSON-LD 結構化資料：Google 在搜尋結果可顯示 rich snippet（評分 / app 類別等）
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  alternateName: "Trashform 廢棄物 AI 辨識",
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  inLanguage: "zh-TW",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TWD",
  },
  publisher: {
    "@type": "Organization",
    name: "臺北市數位實驗高中",
  },
  potentialAction: {
    "@type": "ViewAction",
    target: SITE.url,
  },
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
        {/* JSON-LD：放最後不擋渲染；Google / Facebook 等爬蟲會抓 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}
