# Trashform v2 — Technical Spec

對應 [PRD.md](./PRD.md)。本份描述 v2 的技術選型、資料結構、頁面與 API 介面、部署方式。

## 1. 技術選型

| 層 | 選擇 | 理由 |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | 與 v1 一致，Vercel 一鍵部署 |
| Style | Tailwind CSS v4 | 與 v1 一致，RWD utility 完整 |
| AI | Gemini 2.5 Flash via `@google/generative-ai` | v1 已驗證，多模態 + 免費額度 |
| AI 呼叫位置 | **瀏覽器端直呼** | 使用者自帶 API Key；不經 Next.js Route Handler |
| 資料儲存 | 靜態 JSON（repo 內）+ `localStorage`（API Key、回報草稿） | v2 不需後端 |
| 部署 | GitHub → Vercel auto-deploy | main branch = production |

> 注意：v1 的 `app/api/analyze/route.ts` 在 v2 **不再使用**。改為前端直接 `fetch` Google Generative Language API。Route Handler 保留為「無 Key 演示模式」的可選備援，預設關閉。

## 2. 目錄結構

```
回收專案/
├── PRD.md
├── SPEC.md
├── v1/                 # 既有，不動
└── v2/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx          # 主頁（拍照 / 結果 / 追問）
    │   ├── catalog/page.tsx  # 101 類瀏覽 + 手動搜尋
    │   ├── settings/page.tsx # API Key 設定 + 縣市選擇
    │   └── globals.css
    ├── components/
    │   ├── ImageUploader.tsx
    │   ├── ResultCard.tsx
    │   ├── ClarifyDialog.tsx     # 追問 UI
    │   ├── ApiKeyGate.tsx        # 首次未設 Key 的彈窗
    │   ├── CityPicker.tsx        # Header 右上角的縣市切換
    │   ├── ManualSearch.tsx      # 手動搜尋 101 類
    │   └── ReportDialog.tsx      # 錯誤回報
    ├── lib/
    │   ├── gemini.ts             # 瀏覽器端 Gemini 客戶端封裝
    │   ├── storage.ts            # localStorage helpers
    │   ├── types.ts
    │   ├── catalog/
    │   │   ├── index.ts          # 101 類載入與索引
    │   │   ├── items.json        # 101 類定義（id / 名稱 / 大類 / 別名）
    │   │   └── rules/
    │   │       ├── taipei.json   # 臺北市每類處理指引
    │   │       └── kaohsiung.json
    │   └── prompts.ts            # 兩段式 prompt 模板
    ├── public/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.* / postcss.config.mjs
    └── README.md
```

## 3. 資料模型

### 3.1 廢棄物項目 `Item`（101 類，共用）

```ts
type CategoryGroup =
  | "paper" | "plastic" | "glass" | "metal"
  | "food" | "general" | "hazardous" | "large"
  | "electronics" | "clothing";

interface Item {
  id: string;              // e.g. "paper_cup", "ali_pak"
  nameZh: string;          // 主要中文名（繁中）
  aliases: string[];       // 別名 / 關鍵字
  group: CategoryGroup;    // 所屬大類（v1 的 10 類）
  emoji?: string;
  defaultTips?: string[];  // 與縣市無關的通用提示
}
```

### 3.2 縣市規則 `CityRule`

```ts
type CityId = "taipei" | "kaohsiung";

interface CityRule {
  cityId: CityId;
  cityName: string;        // "臺北市" / "高雄市"
  // 每個 item 的在地化指引；缺項 fallback 到 group 預設
  items: Record<
    string,                // Item.id
    {
      disposal: string;    // "下一步怎麼做"
      binColor?: string;
      schedule?: string;   // 收運時段
      notes?: string[];
      sourceUrl?: string;  // 法規連結
    }
  >;
  groupDefaults: Record<CategoryGroup, { disposal: string; binColor?: string }>;
}
```

### 3.3 AI 結果

```ts
type Confidence = "high" | "medium" | "low";

type AnalyzeResult =
  | {
      status: "identified";
      itemId: string;          // 對應 catalog 中某個 Item
      itemName: string;        // AI 給的具體名稱（可能比 nameZh 更具體）
      group: CategoryGroup;
      confidence: Confidence;
      explanation: string;     // 1~2 句話為何這樣分
    }
  | {
      status: "uncertain";
      partialName?: string;
      candidateItemIds?: string[];   // 縮小範圍的候選
      questions: { id: string; q: string; options: string[] }[];
      requestBetterImage: boolean;
    }
  | { status: "error"; message: string };
```

### 3.4 LocalStorage Keys

| Key | 內容 |
|---|---|
| `tf:apiKey`         | 使用者貼入的 Gemini API Key（明文，在使用者本機） |
| `tf:cityId`         | "taipei" \| "kaohsiung"（預設 "taipei"） |
| `tf:reports`        | 錯誤回報陣列（最多保留 50 筆） |
| `tf:lastAnalyses`   | 最近 10 筆辨識結果（除錯/Demo 用） |

## 4. 頁面與互動

### 4.1 `/`（主頁）

桌機 ≥1024px：兩欄。左 60% 是 Uploader / 預覽，右 40% 是說明卡片或結果卡片。
手機：單欄。

狀態機：

```
idle  ──(上傳/拍照)──>  ready  ──(辨識)──>  analyzing  ──> result | clarifying
clarifying  ──(回答追問)──>  analyzing
result      ──(重來)──>  idle
```

第一次點「開始辨識」時若 `tf:apiKey` 為空 → 彈出 `ApiKeyGate`。

### 4.2 `/catalog`（資料庫瀏覽）

- 搜尋框（即時 filter，比對 `nameZh + aliases`）。
- 大類 chips 篩選（10 類）。
- 點任一項目 → 抽屜開啟，顯示當前縣市指引。

### 4.3 `/settings`

- Gemini API Key 輸入（masked）+「如何取得」連結到 https://aistudio.google.com/apikey
- 縣市 radio：臺北市 / 高雄市
- 「清除本機資料」按鈕（清空所有 `tf:*` keys）

## 5. AI 互動細節

### 5.1 兩段式 Prompt

**第一段（廣分類）**：給 10 大類，要求 Gemini 回 `group` + 候選的 `itemId` 清單（最多 5 個）+ confidence。

**第二段（細分類，僅當廣分類 high 時跳過、medium/low 時觸發）**：用第一段的候選 itemId（從 catalog 取出該大類的所有 items）餵入 prompt 要求二選一/三選一。

兩段都用同一張圖（base64 內嵌），Token 不重複上傳。

### 5.2 信心度策略

| confidence | 行為 |
|---|---|
| high   | 直接顯示結果頁 |
| medium | 顯示結果頁 + 紅字「請再確認」+「查看其他可能」按鈕 |
| low    | **不顯示結果**，跳到 clarifying，最多 3 題追問 |

### 5.3 追問題目來源

- Gemini 在 status=uncertain 時自行生成 1~3 題（已驗證 v1 可做到）。
- 每題包含 `q` 與 `options`（封閉式，避免使用者輸入）。
- 使用者答完 → 把 Q&A 串在第二次 prompt 末尾再次辨識。

### 5.4 完全無法辨識

第二次仍 uncertain → 顯示「我們無法辨識，請手動搜尋」按鈕跳到 `/catalog?q=<partialName>`。

## 6. 101 類資料來源計畫

- 主索引取自《回收大百科》（rethinktw.org）公開可瀏覽之品項清單。
- 文字描述自行撰寫，引用環保局法規時附 `sourceUrl`。
- 初版可用腳本 `scripts/seed-catalog.ts`（後續加）半自動產出 `items.json` 骨架，再手工補處理規則。
- v2 上線時若還沒補滿 101 類，缺項以 `groupDefaults` fallback，不阻塞發佈。

## 7. RWD Breakpoints

沿用 Tailwind 預設：

| Breakpoint | 寬度 | 主要變化 |
|---|---|---|
| base | <640 | 單欄，max-w-md，沿用 v1 風格 |
| `sm` | ≥640 | 容器寬度放寬到 max-w-xl |
| `md` | ≥768 | 兩欄出現，左圖右文 |
| `lg` | ≥1024 | 容器 max-w-5xl，emoji 輪播加大 |
| `xl` | ≥1280 | 內容置中，左右留白增加 |

設計細節：
- Header 在桌機顯示完整 nav（首頁 / 資料庫 / 設定 / 縣市切換），手機收進右上漢堡或底部 tab。
- ImageUploader 在桌機支援拖放，在手機保留 `capture="environment"` 直接開相機。
- ResultCard 在桌機改為 sticky，捲動圖片時指引固定可見。

## 8. 安全與隱私

- API Key 永不送到 Vercel server。所有 Gemini 呼叫從 client 直發。
- Repo `.gitignore` 內排除 `.env*.local`。
- 使用者每次開啟「設定」可刪除 Key。
- README 與 `/settings` 頁面顯眼標示：「請使用個人 Gemini API Key，勿使用機構付費金鑰。」

## 9. 部署

1. `v2/` 為獨立 Next.js 專案，獨立 `package.json`。
2. GitHub repo：`trashform-v2`（建議 public，方便 Vercel 拉取與後續 PR 流程）。
3. Vercel 設定：
   - Framework Preset: Next.js
   - Root Directory: `v2`（在專案資料夾下）
   - Build Command: 預設 `next build`
   - 不需設定任何環境變數（API Key 由使用者輸入）
4. main 分支推送即上線。

## 10. 後續（v3 預告，本份不實作）

- 淨灘模式 + 群組軌跡
- 全臺縣市
- Supabase 接後端 → 持續學習 + 成就機制
- 自有 fine-tuned 模型減少 token 成本
