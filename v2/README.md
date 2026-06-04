# Trashform v2 — `recycle-ai-tw`

**中文** · [English](README.en.md) · **目前版本：v2.4**（[變更歷程](#變更歷程)）

> 以 AI 影像辨識彌補民眾廢棄物分類認知落差 — 涵蓋日常回收與淨灘場域之在地化指引系統。臺北市數位實驗高中公民行動學期專題。

🌐 線上：<https://recycle-ai-tw.vercel.app>
📄 提案文件：[PRD](../PRD.md) · [SPEC](../SPEC.md)
📷 操作截圖與影片：[../回收網頁操作/](../回收網頁操作/)

---

## 目錄

- [功能總覽](#功能總覽)
- [架構](#架構)
- [技術棧](#技術棧)
- [本地開發](#本地開發)
- [部署到 Vercel](#部署到-vercel)
- [專案結構](#專案結構)
- [資料庫綱要](#資料庫綱要)
- [API 端點](#api-端點)
- [維運腳本](#維運腳本)
- [新增物品 / 縣市 / 環保冷知識](#新增物品--縣市--環保冷知識)
- [安全注意事項](#安全注意事項)
- [變更歷程](#變更歷程)

---

## 功能總覽

### 一般使用者

#### 辨識流程
- 拍照 / 選擇 1 張廢棄物照片
- **自動辨識**：照片上傳完成 + Cloudflare Turnstile 驗證通過後**自動開始辨識**，不再需要按按鈕
- **拍攝指引彈窗**：點擊拍攝前先顯示主體清晰、單一物品、光線充足等小技巧
- **HEIC 自動轉檔**：iPhone 拍照的 HEIC / HEIF 在客戶端先轉成 JPEG，失敗 fallback 到 server 端再試一次
- **客戶端縮圖**：超過 2560 px 自動降採樣，避開 Vercel serverless 的 4.5 MB body 上限
- **辨識中的環保冷知識**：等待 5–10 秒的同時，隨機播放 1–3 則環保冷知識輪播

#### 辨識結果
- 結果以**彈出式視窗**呈現，重要文字（物品名稱、應投入桶色）加大，省略冗長說明
- **複合材質拆解**：如「手搖飲杯 = 紙杯 + 吸管 + 封膜」，每個部件分別給出處理方式
- 信心度（高 / 中 / 低）、所屬大類、投入桶色、備註、法規依據
- **跨縣市差異顯示**：同一物品在臺北市與高雄市的不同處理方式並列對比
- 「回報分錯了」永久保留照片到後台供資料庫改善
- 支援臺北市 / 高雄市兩套處理規則，可在頁面右上即時切換

#### 身份驗證模式
彈出視窗讓使用者擇一：
- **組織代號**（推薦）— 老師發放代號（例如 `t202605`），共用後端 Gemini Key，學生無需自備 API
- **自己的 Gemini API Key** — 只存在瀏覽器 LocalStorage，從不上傳

#### 使用者回頭率設計
- **IG + 回饋表單按鈕**：常駐首頁
- **首次辨識成功彈窗**：第一次出現 identified 結果時提示追蹤 IG / 留下回饋（每裝置只跳一次）
- **加到手機桌面 (PWA)**：
  - Android Chrome / Edge / Samsung：捕捉 `beforeinstallprompt`，按下直接彈原生安裝對話框
  - iOS Safari：跳教學「分享 → 加入主畫面」（Safari 不允許程式觸發安裝）
  - 已安裝（standalone）→ 按鈕不顯示
  - 使用者按過「晚點再說」→ 7 天冷卻
- **PWA 啟動過場動畫**：
  - iOS：用 `apple-touch-startup-image` 顯示品牌啟動圖（13 種尺寸涵蓋全機型），消除「閃一下首頁」
  - Android：Chrome 用 manifest 系統 splash
  - WebView 接手後 in-page splash 淡出
- **使用教學頁**：根據裝置自動切換手機 / 桌機版的影片與截圖
- **頂端 nav 避開 Dynamic Island**：用 `env(safe-area-inset-top)` 留出瀏海空間

#### 系統健壯性
- **速率限制 ≠ 辨識失敗**：Gemini 回 429 / quota 時不寫資料庫、不污染統計，前端跳「系統錯誤」彈窗 5 秒倒數後自動 reload
- **彩蛋**：API Key 欄位輸入 `67676767` 會播放音效

### 管理員（`/admin`）

- **儀表板**：4 個 KPI（總辨識數、識別率、不確定數、錯誤回報數）+ 物品大類分布柱狀圖 + 近 30 日辨識量折線圖
- **辨識紀錄**：所有 recognition 文字記錄，分頁
- **異動回報**：
  - 使用者主動「分錯了」回報（manual）
  - AI 不確定（auto_uncertain）自動歸檔
  - AI 失敗（auto_error）自動歸檔
  - 所有圖片永久保留於 Vercel Blob（private）
- **組織代號管理**：建立 / 編輯 / 啟停用 / 刪除（API Key 加密存 DB，從不回吐到前端）
- **環保冷知識管理**：CRUD 環保冷知識資料庫（前端辨識中畫面隨機播放）
- **速率限制紀錄清理**：一鍵刪除所有「Gemini 已達上限」自動歸檔的污染資料
- **修改密碼**

### 圖片儲存最佳化
- 上傳到 Blob 前用 **sharp 壓縮**（max 1600 px、JPEG mozjpeg q75）
- 既有圖片可用 `scripts/compress-existing-blobs.ts` 一次性遷移壓縮（實測 14.58 MB → 1.42 MB，省 90%）

---

## 架構

```
                    ┌─────────────────────────┐
                    │  Cloudflare Turnstile   │
                    └──────────▲──────────────┘
                               │ token
   ┌───────────┐  POST FormData  ┌──────────────────────────┐
   │  Browser  │ ──────────────▶ │   Next.js (Vercel)       │
   │  (PWA)    │                 │  /api/analyze            │
   │           │                 │   ─ verify Turnstile     │
   │           │ ◀──── JSON ──── │   ─ resolve key:         │
   └─────▲─────┘                 │       own → from req     │
         │                       │       org → DB lookup    │
         │ /api/eco-facts        │   ─ HEIC fallback        │
         │ /api/orgs/validate    │   ─ call Gemini          │
         │ /api/report-error     │   ─ insert recognition   │
         │                       │   ─ if uncertain/error:  │
         │                       │       sharp compress +   │
         │                       │       upload Blob +      │
         │                       │       insert error_report│
         │                       └────┬─────────────┬───────┘
                                      │             │
                            Gemini API│             │ Postgres / Blob
                                      ▼             ▼
                              Google AI         Vercel Storage
```

- **Postgres** 存：`recognition_records`、`error_reports`、`organizations`、`admin_settings`、`eco_facts`
- **Blob (private)** 永久保留錯誤回報照片
- 管理員看圖走 `/api/admin/blob-proxy?p=…`，token 不曝露給瀏覽器

---

## 技術棧

| 用途 | 套件 / 服務 |
|---|---|
| Framework | Next.js 16 App Router (webpack) |
| UI | React 19 + Tailwind v4（深色主題） |
| AI | `@google/generative-ai`（Gemini 2.5 Flash） |
| DB | `@vercel/postgres`（Neon） |
| Object storage | `@vercel/blob` v2（private） |
| Image processing | `sharp`（壓縮）、`heic-convert`（server HEIC fallback）、`heic2any`（client HEIC） |
| Auth | `jose` JWT cookie + `bcryptjs` |
| Bot check | Cloudflare Turnstile |
| Charts | `recharts` |
| PWA | 自製 `app/manifest.ts` + `public/sw.js` + 動態生成 apple-touch-startup-image |
| Hosting | Vercel（Root Directory = `v2`） |

---

## 本地開發

```bash
git clone https://github.com/masonzeng702550/recycle-ai-tw.git
cd recycle-ai-tw/v2          # 所有 source 在 v2/ 子目錄
npm install
cp .env.example .env.local   # 填入該填的（見下表）
npm run dev                  # http://localhost:3000
```

`POSTGRES_URL` / `BLOB_READ_WRITE_TOKEN` 在 Vercel 上是 sensitive，無法 `vercel env pull` 取回，請到 Vercel Dashboard / Neon Console 複製貼上到 `.env.local`。

```bash
npm run build   # 含 db:init（schema 套用）+ next build
npm run lint
```

`scripts/init-db.ts` 在 build 前自動跑，`POSTGRES_URL` 不存在時 no-op，schema 都用 `IF NOT EXISTS / ADD COLUMN IF NOT EXISTS`，重複執行安全。

### 環境變數

| 變數 | 必填 | 來源 | 用途 |
|---|---|---|---|
| `POSTGRES_URL` | ✓ | Vercel Postgres 自動注入 | DB 連線 |
| `BLOB_READ_WRITE_TOKEN` | ✓ | Vercel Blob 自動注入 | Blob 上傳 / 讀取 |
| `JWT_SECRET` | ✓ | `openssl rand -base64 48` | admin cookie 簽章 |
| `ADMIN_USERNAME` | ✓ | 自填 | 管理員帳號 |
| `ADMIN_PASSWORD` | 初始 | 自填 | 第一次部署用，登入後改密碼即可移除 |
| `ADMIN_PASSWORD_HASH` | 進階 | bcryptjs hash | 直接給 hash（優先於 plain） |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✓ | Cloudflare Turnstile | 瀏覽器端 widget |
| `TURNSTILE_SECRET_KEY` | ✓ | Cloudflare Turnstile | server-side 驗證 |

---

## 部署到 Vercel

1. **連 GitHub** — Project Settings → Git，連到此 repo
2. **Root Directory** — Settings → General → `v2`
3. **Storage** — Project → Storage：
   - 加 **Postgres** (Neon) → Connect Project（自動注入 `POSTGRES_URL` 等）
   - 加 **Blob**（預設 private 即可）→ Connect Project（自動注入 `BLOB_READ_WRITE_TOKEN`）
4. **環境變數**：
   ```bash
   vercel env add JWT_SECRET production --value "$(openssl rand -base64 48)"
   vercel env add ADMIN_USERNAME production --value "你的帳號" --no-sensitive
   vercel env add ADMIN_PASSWORD production --value "初始密碼"
   vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production --value "<site_key>" --no-sensitive
   vercel env add TURNSTILE_SECRET_KEY production --value "<secret_key>"
   ```
   Cloudflare Turnstile：<https://dash.cloudflare.com/?to=/:account/turnstile>，Domain 填部署網址。
5. **Push to main** → 自動部署，build 步驟會自動套用 schema
6. **首次登入** `/admin/login`，**馬上去「修改密碼」改掉初始密碼**（之後 `ADMIN_PASSWORD` 可從 env 移除）
7. **環保冷知識初始化**：第一次需要在 admin 後台從 `db/eco-facts-seed.json` 匯入種子資料

---

## 專案結構

```
v2/
├ app/
│  ├ page.tsx                    辨識主頁（自動辨識 + Turnstile + /api/analyze）
│  ├ catalog/page.tsx            手動搜尋資料庫
│  ├ settings/page.tsx           API Key / 組織代號 / 縣市
│  ├ tutorial/page.tsx           使用教學（裝置自動切換手機 / 桌機版媒體）
│  ├ layout.tsx                  Metadata + PWA splash inline script + safe-area
│  ├ manifest.ts                 PWA manifest (Next metadata route)
│  ├ admin/
│  │  ├ login/                   不套用 (authed) layout
│  │  └ (authed)/                JWT cookie 才能進
│  │     ├ layout.tsx            sidebar 導覽（safe-area-inset-top）
│  │     ├ page.tsx              儀表板（KPI + 圖表）
│  │     ├ records/              辨識紀錄
│  │     ├ reports/              異動回報（含速率限制清理按鈕）
│  │     ├ orgs/                 組織代號管理
│  │     ├ eco-facts/            環保冷知識管理
│  │     └ change-password/
│  └ api/
│     ├ analyze/                 公開：辨識主端點（429 不寫 DB）
│     ├ report-error/            公開：人工回報（必附圖）
│     ├ orgs/validate/           公開：驗證組織代號（不回 key）
│     ├ eco-facts/               公開：隨機抓 1–5 則環保冷知識
│     └ admin/                   middleware 保護
│        ├ login/  logout/  change-password/
│        ├ records/  reports/  stats/
│        ├ orgs/  orgs/[id]/
│        ├ eco-facts/  eco-facts/[id]/
│        ├ cleanup-rate-limit/   清掉「Gemini 已達上限」污染資料
│        └ blob-proxy/           private Blob 照片 server-side proxy
├ components/
│  ├ ImageUploader.tsx           單張、拍攝指引彈窗、FileList snapshot 修復
│  ├ TurnstileWidget.tsx         Cloudflare Turnstile 包裝
│  ├ ResultCard.tsx              結果彈窗（含複合材質拆解 + 跨縣市差異）
│  ├ ReportDialog.tsx            「分錯了」對話框
│  ├ EcoFactsTicker.tsx          辨識中環保冷知識輪播
│  ├ SocialLinks.tsx             IG / 回饋表單按鈕
│  ├ FirstSuccessPromo.tsx       首次成功彈窗
│  ├ InstallAppButton.tsx        加到手機桌面（Android beforeinstallprompt + iOS 教學）
│  ├ ServiceWorkerRegister.tsx   /sw.js 註冊
│  ├ SystemBusyModal.tsx         429 / RATE_LIMIT 彈窗 + 自動 reload
│  ├ ApiKeyGate.tsx              組織代號 / 自帶 Key 雙選擇
│  ├ admin/                      AdminNav / StatsCharts
│  └ …
├ lib/
│  ├ types.ts                    共用 type（含 ErrorResult.code = "RATE_LIMIT" | "INVALID_KEY"）
│  ├ catalog/
│  │  ├ items.json               廢棄物項目（60+，目標 101）
│  │  └ rules/{taipei,kaohsiung}.json
│  ├ prompts.ts                  Gemini 提示詞（含複合材質範例）
│  ├ gemini-server.ts            伺服器端 Gemini 呼叫（含 RATE_LIMIT 偵測）
│  ├ db.ts                       全部 SQL（recognition / report / org / eco-facts）
│  ├ blob.ts                     上傳到 private Blob
│  ├ auth.ts                     JWT cookie + bcrypt
│  ├ turnstile.ts                CF siteverify
│  ├ image-resize.ts             客戶端縮圖避開 4.5 MB body 上限
│  ├ image-compress.ts           伺服器端 sharp 壓縮（1600 px、q75）
│  ├ heic-server.ts              server HEIC → JPEG fallback
│  ├ easter-egg.ts               67676767 音效彩蛋
│  ├ social.ts                   IG / 回饋表單 URL 常數
│  ├ storage.ts                  客戶端 localStorage 包裝
│  ├ server-env.ts               集中讀環境變數
│  └ api-contracts.ts            前後端共用 request/response 形狀
├ public/
│  ├ sw.js                       極簡 service worker（Chrome PWA 安裝必需）
│  ├ icons/                      PWA icons + favicons
│  └ icons/splash/               13 張 apple-touch-startup-image
├ middleware.ts                  保護 /admin/* 與 /api/admin/*
├ db/
│  ├ schema.sql                  CREATE TABLE IF NOT EXISTS + 遷移
│  └ eco-facts-seed.json         環保冷知識種子資料
└ scripts/
   ├ init-db.ts                  build 前自動跑 schema
   ├ blob-stats.ts               列出 error-reports/ blob 總量
   ├ compress-existing-blobs.ts  既有 blob 一次性壓縮
   ├ cleanup-rate-limit-records.ts  本機版速率限制資料清理
   ├ db-stats.ts                 Postgres 大小與表格列數
   ├ generate-pwa-icons.ts       sharp 動態產生 7 種 PWA / favicon
   └ generate-pwa-splash.ts      sharp 動態產生 13 張 iOS 啟動圖
```

---

## 資料庫綱要

```sql
recognition_records            -- 每次辨識的文字結果
  id, created_at, city_id, status, item_id, item_name,
  group_name, confidence, explanation,
  key_mode, org_code,            -- own/org 路由標記
  raw_response (jsonb)

error_reports                  -- 人工 + 自動歸檔（速率限制不寫）
  id, created_at, recognition_id (FK), blob_url, blob_pathname,
  user_comment, reported_item_id, city_id,
  source                       -- manual / auto_uncertain / auto_error

organizations                  -- 組織代號（API key 加密存）
  id, code, name, api_key, active, created_at, updated_at

eco_facts                      -- 環保冷知識
  id, content, active, created_at, updated_at

admin_settings                 -- 單列：管理員密碼 hash
  id=1, password_hash, updated_at
```

`source` 欄位驅動異動回報的 badge：
- 紅色「人工回報」（使用者主動回報分錯）
- 黃色「異動回報 · AI 不確定」
- 橘色「異動回報 · AI 失敗」

---

## API 端點

### 公開
| 路徑 | 方法 | 用途 |
|---|---|---|
| `/api/analyze` | POST | 主辨識端點（FormData：image + cityId + turnstileToken + keyMode + apiKey?/orgCode?）|
| `/api/report-error` | POST | 使用者「分錯了」回報，必附圖 |
| `/api/orgs/validate` | POST | 驗證組織代號（只回 `{ok, name?}`，不回 key）|
| `/api/eco-facts` | GET | 隨機抓 1–5 則環保冷知識 |
| `/manifest.webmanifest` | GET | PWA manifest（由 `app/manifest.ts` 動態生成）|

### 管理員（middleware JWT cookie）
| 路徑 | 方法 | 用途 |
|---|---|---|
| `/api/admin/login` | POST | 帳密驗證、發 cookie |
| `/api/admin/logout` | POST | 清 cookie |
| `/api/admin/change-password` | POST | 變更密碼 |
| `/api/admin/stats` | GET | 儀表板資料（60s server-memory cache）|
| `/api/admin/records` | GET | 辨識紀錄分頁 |
| `/api/admin/reports` | GET | 異動回報分頁 |
| `/api/admin/orgs` | GET / POST | 組織列表、建立 |
| `/api/admin/orgs/[id]` | PATCH / DELETE | 更新、刪除 |
| `/api/admin/eco-facts` | GET / POST | 環保冷知識列表、建立 |
| `/api/admin/eco-facts/[id]` | PATCH / DELETE | 更新、刪除 |
| `/api/admin/cleanup-rate-limit` | POST | 清掉 429 自動歸檔污染資料 |
| `/api/admin/blob-proxy?p=…` | GET | private Blob 圖片代抓（帶 token） |

---

## 維運腳本

| 腳本 | 用途 | 何時跑 |
|---|---|---|
| `scripts/init-db.ts` | 套用 / 升級 schema | build 自動跑（`POSTGRES_URL` 缺時 no-op）|
| `scripts/blob-stats.ts` | 列出 error-reports/ 總大小 + 副檔名分布 + Top 10 | 評估 blob 用量 |
| `scripts/compress-existing-blobs.ts` | 用 sharp 把既有 blob 全部重壓縮（覆蓋同 pathname）| 第一次部署壓縮 / 偶爾優化 |
| `scripts/cleanup-rate-limit-records.ts` | 本機版「清掉速率限制紀錄」（admin UI 同功能）| `POSTGRES_URL` 可達時使用 |
| `scripts/db-stats.ts` | Postgres 容量與各表 row 數 | 評估 Neon 用量 |
| `scripts/generate-pwa-icons.ts` | 從 SVG 模板渲染 7 張 PWA / favicon | logo 改了再跑 |
| `scripts/generate-pwa-splash.ts` | 從 SVG 模板渲染 13 張 iOS apple-touch-startup-image | logo / splash 設計改了再跑 |

執行方式：
```bash
cd v2
vercel env pull .env.production.local
npx tsx scripts/<name>.ts
# 或：set -a && . ./.env.production.local && set +a && npx tsx scripts/<name>.ts
```

---

## 新增物品 / 縣市 / 環保冷知識

### 新增物品
編輯 [`lib/catalog/items.json`](lib/catalog/items.json)：
```json
{ "id": "kebab_case_id", "nameZh": "中文名", "aliases": ["別名"], "group": "paper", "emoji": "📦" }
```
之後在 `lib/catalog/rules/{city}.json` 對應 city 加 `items.<id>` 區塊填本地處理方式（可省略，未填則 fallback 到 `groupDefaults`）。

### 新增縣市
1. 加 `lib/catalog/rules/<cityId>.json`（依現有 `taipei.json` 結構）
2. `lib/types.ts` 的 `CityId` 加新值
3. `components/CityPicker.tsx` 加選項
4. `lib/catalog/index.ts` 註冊

### 新增環保冷知識
從 admin 後台 `/admin/eco-facts` 直接 CRUD，或匯入 `db/eco-facts-seed.json` 的內容。

---

## 安全注意事項

- 預設管理員密碼 `15ch00l5@M5vnG` 僅供初始部署；**生產上請務必登入後立即變更**。
- 組織 API Key 只存 server，前端永遠拿不到，`/api/orgs/validate` 也只回 `{ok, name?}`。
- Blob 是 private store，admin 看圖必須帶 cookie 走 `/api/admin/blob-proxy`，外部無法直接拉到 URL。
- `/api/admin/*` 與 `/admin/*` 由 [`middleware.ts`](middleware.ts) 統一以 JWT cookie 把關（login/logout 端點除外）。
- Cloudflare Turnstile 驗證所有 `/api/analyze` 請求，擋掉爬蟲與 abuse。
- 圖片壓縮在 server 完成，避免使用者裝置慢時上傳大檔。
- 速率限制錯誤不寫 DB / blob，避免攻擊者用大量請求灌爆儲存空間。

---

## 變更歷程

每個版本對應一個明確的階段任務（不是純按日期切，是按主題切）。每點以一句話或一段話描述功能本身的意義。

### v2.0 · 純前端雛形（2026-04-29）

- **辨識照片中的物品，並透過 AI「自行生成回覆」，不支援複合材質。**
- 純前端架構（Next.js + React + Tailwind），完全沒有後端。
- Gemini API 從瀏覽器直接呼叫，API Key 只暫存在 localStorage，不會送到我們的伺服器。
- 內建臺北市與高雄市兩套廢棄物 catalog 與結果頁雛形。

### v2.1 · 全端化（2026-05-13 ~ 05-14）

- **支援複合材質辨識** — 像手搖飲杯這種由紙杯、吸管、封膜組成的物品，AI 會自動拆解、列出每個部件對應的處理方式。
- 一天內把整個堆疊翻新：Postgres + Blob + Cloudflare Turnstile + JWT admin 後台。
- 組織代號制度 — 老師發代號（例如 `t202605`）給學生，學生無需自備 Gemini API Key，背後共用 server-side 金鑰。
- iPhone 拍照常見的 HEIC / HEIF 自動轉成 JPEG（client 主、server fallback），不用使用者自己處理。
- 客戶端先把超大照片縮到 2560 px 以內，避開 Vercel serverless 的 4.5 MB body 上限。
- AI 判斷為「不確定」或「失敗」的辨識會自動歸檔到後台錯誤回報，照片永久保留供日後改善資料庫。

### v2.2 · 使用教學（2026-05-18）

- 新增「使用教學」頁，會根據使用者裝置自動切換手機版 / 桌機版的截圖與操作影片。
- 修正窄手機上頂端 nav 標籤會縱向換行的問題，視覺更乾淨。

### v2.3 · 手機優先 + 去摩擦（2026-05-27 ~ 05-31）

- 第一次使用的彈窗改成雙選：使用組織代號（共用後端 Key）或使用自己的 Gemini API Key，文案直接告知學生輸入 `t202605`。
- Server 端用 sharp 壓縮上傳到 Blob 的圖片（縮 1600 px、JPEG q75），且既有 19 張歷史圖一次性遷移壓縮 — 從 14.58 MB 變成 1.42 MB，省 90%。
- 上傳完成 + Turnstile 通過後**自動開始辨識**，移除「開始辨識」按鈕，少一步操作摩擦。
- Gemini 速率限制錯誤（429）跟「真的辨識失敗」明確分離 — 不寫資料庫不污染統計，前端跳「系統錯誤」彈窗倒數 5 秒自動 reload；後台另有按鈕一鍵清掉既有污染資料。
- **加入社群帳號連結按鈕，增加專案曝光**（首頁 IG `@trashform.team` 漸層 pill 按鈕）。
- **加入回饋表單連結按鈕，提升填寫表單回饋的可能性**（首頁 Google Form 連結按鈕）。
- 第一次辨識成功彈窗 — 第一次拿到 identified 結果時跳一次性提示，鼓勵使用者追蹤 IG 或填回饋表單。
- **加入手機桌面書籤設定引導，提高 App 持續被使用的機會** — Android Chrome 一鍵叫起原生 PWA 安裝對話框；iOS Safari 跳「分享 → 加入主畫面」三步教學；已安裝（standalone）則自動隱藏按鈕。
- 彩蛋：在 API Key 欄位輸入 `67676767` 會播放一段音效。

### v2.4 · 結果體驗 + 社群分享（當前，2026-06-01 ~ 06-04）

- 修正 iPhone PWA 在全螢幕 standalone 模式下，頂端 nav 會被 Dynamic Island 蓋住的問題（用 `env(safe-area-inset-top)` 撐開安全區）。
- PWA 啟動過場動畫 — 自製品牌 splash + 13 種尺寸的 `apple-touch-startup-image` 涵蓋所有現代 iPhone / iPad，徹底消除 iOS「閃一下首頁才出現動畫」的問題。
- 辨識結果改用彈出式視窗呈現，避免使用者錯過。
- **調整網站字體大小，讓整體介面更加清晰** — 結果頁的物品名稱、處理方式、投入桶色字級放大，並把冗長的說明文字精簡。
- 次要資訊（AI 判斷說明、注意事項、各縣市差異）全部收進 `<details>` 收合式選單，主畫面只保留「回收種類 / 處理方式 / 投入桶」三大關鍵欄位。
- 結果頁顯示跨縣市處理方式差異，使用者看臺北的同時可以對照高雄怎麼處理同一個物品。
- 點擊拍攝前先跳出拍攝技巧指引（主體清晰、單一物品、光線充足等），提升首次辨識準確率。
- 新增「環保冷知識」資料庫（後台 CRUD，每則可選配中文梗圖），辨識等待畫面隨機輪播 1~3 則。
- 行動裝置可一鍵把冷知識或辨識結果分享到 Instagram 限時動態（Canvas 動態生 1080×1920 限動圖，含品牌 logo / URL pill / @mention）或 LINE（URL scheme 預填訊息）；URL 自動複製到剪貼簿，方便貼到 IG 連結貼紙。
- 儀表板新增匯出按鈕 — 一鍵下載 CSV，或開啟列印友善的完整報表頁（含 KPI 表格、大類分布圖、近 30 天折線圖），瀏覽器可直接另存 PDF。

完整 commit 紀錄：`git log --oneline`

---

## 授權與致謝

公民行動學期專題（**臺北市數位實驗高中**），分類規則僅供參考，**最終以各市環保局公告為準**。

- 資料骨架參考：[回收大百科](https://recycle.rethinktw.org/)
- AI：Google Gemini 2.5 Flash
- 部署：Vercel + Neon + Cloudflare Turnstile

聯絡：[Instagram @trashform.team](https://www.instagram.com/trashform.team/) · [回饋表單](https://docs.google.com/forms/d/e/1FAIpQLSdylVR5SBsWxbGog3OFcfuAkdk51W-N0sQd-vX8o3GhdStKxQ/viewform)
