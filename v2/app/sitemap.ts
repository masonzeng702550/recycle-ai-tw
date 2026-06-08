import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// 自動產生 /sitemap.xml — 只列公開可索引頁面，admin / settings 不列。
// 任何使用者個人化（settings）或敏感（admin）路徑都不該進 sitemap，
// 因為 sitemap 是「告訴 Google 我希望你收錄的網址」清單。
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE.url}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE.url}/catalog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/tutorial`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
