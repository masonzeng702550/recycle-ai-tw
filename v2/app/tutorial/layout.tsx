import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/seo";

const TITLE = "使用教學｜怎麼用 Trashform 辨識廢棄物";
const DESCRIPTION =
  "三步驟教學：拍照、等 AI 辨識、看結果。含手機版 / 電腦版操作影片與分步驟截圖，第一次使用也能立刻上手。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tutorial" },
  openGraph: {
    title: `${TITLE}｜${SITE.name}`,
    description: DESCRIPTION,
    url: absoluteUrl("/tutorial"),
    siteName: SITE.name,
    type: "article",
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE}｜${SITE.name}`,
    description: DESCRIPTION,
  },
};

export default function TutorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
