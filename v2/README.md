# recycle-ai-tw (Trashform v2.0)

> 「以 AI 影像辨識彌補民眾廢棄物分類認知落差——涵蓋日常回收與淨灘場域之在地化指引系統」公民行動 v2 網站。

對應提案文件：
- [PRD](../PRD.md)
- [SPEC](../SPEC.md)

## 特色

- 拍照 / 上傳 → Gemini 影像辨識 → 顯示信心度 + 處理指引
- 信心不足時 AI 追問 1~3 題，回答後重判
- 完全無法辨識：手動到資料庫搜尋
- 支援 **臺北市 / 高雄市** 兩套規則
- API Key 完全在使用者瀏覽器，零後端
- RWD：手機單欄、桌機左圖右指引兩欄

## 開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000，第一次按「開始辨識」會彈窗要求貼上 Gemini API Key（[到 AI Studio 取得](https://aistudio.google.com/apikey)）。

## 部署

GitHub → Vercel auto-deploy。Vercel 設定 Root Directory = `v2`，無需任何環境變數。

## 結構

```
app/
  page.tsx          — 拍照辨識主頁
  catalog/page.tsx  — 手動搜尋資料庫
  settings/page.tsx — API Key、縣市、清除本機資料
components/
lib/
  gemini.ts         — 瀏覽器端 Gemini 呼叫
  catalog/
    items.json      — 廢棄物項目（v2 起步含 60+ 項，目標 101 項）
    rules/*.json    — 各縣市處理規則
```
