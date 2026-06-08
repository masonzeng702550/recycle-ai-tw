// 全站 SEO 共用常數 — 改一次全部跟著動。
// 任何含「絕對 URL」的 metadata 都從這裡取，避免散落寫死。

export const SITE = {
  url: "https://recycle-ai-tw.vercel.app",
  name: "Trashform",
  shortName: "Trashform",
  fullTitle: "Trashform | AI 廢棄物辨識 — 拍照立刻知道怎麼丟",
  // <title> 範本：頁面標題 + 站名
  titleTemplate: "%s | Trashform",
  description:
    "用 AI 影像辨識幫你判斷廢棄物分類 — 拍下任何東西，立刻告訴你該回收、堆肥還是當一般垃圾，並依臺北市 / 高雄市的處理規則給出對應做法。臺北市數位實驗高中公民行動專題。",
  shortDescription: "拍照辨識廢棄物，立刻知道怎麼分類。",
  locale: "zh_TW",
  themeColor: "#0a0a0a",
  ig: "@trashform.team",
  // OG / 分享關鍵字
  keywords: [
    "資源回收",
    "垃圾分類",
    "AI 辨識",
    "廢棄物辨識",
    "回收 AI",
    "臺北垃圾分類",
    "高雄垃圾分類",
    "Trashform",
    "回收教學",
    "環保",
    "PWA",
  ],
} as const;

export function pageTitle(t?: string): string {
  if (!t) return SITE.fullTitle;
  return `${t} | ${SITE.name}`;
}

export function absoluteUrl(path: string = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
