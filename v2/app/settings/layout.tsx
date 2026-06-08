import type { Metadata } from "next";

// 個人化頁面：noindex（每個瀏覽器看到的內容不同，沒有 SEO 價值）
export const metadata: Metadata = {
  title: "設定",
  description: "個人化設定：組織代號、API Key、預設縣市。",
  robots: { index: false, follow: true },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
