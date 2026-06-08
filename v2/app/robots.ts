import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// 由 Next 自動產生 /robots.txt
// 公開頁全開，admin 與 admin API 全擋；sitemap 指到 /sitemap.xml
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/admin/", "/api/analyze", "/api/report-error"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
