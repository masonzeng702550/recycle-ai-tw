import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/seo";

const TITLE = "資料庫｜手動查詢廢棄物分類";
const DESCRIPTION =
  "Trashform 廢棄物分類資料庫：直接搜尋物品（如保特瓶、紙容器、便當盒、電池），看臺北市與高雄市分別怎麼處理、該投入哪個桶。沒帶手機也能用，無需登入。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: `${TITLE}｜${SITE.name}`,
    description: DESCRIPTION,
    url: absoluteUrl("/catalog"),
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE}｜${SITE.name}`,
    description: DESCRIPTION,
  },
};

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
