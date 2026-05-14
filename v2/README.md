# Trashform v2.1 — `recycle-ai-tw`

> 「以 AI 影像辨識彌補民眾廢棄物分類認知落差——涵蓋日常回收與淨灘場域之在地化指引系統」公民行動 v2 網站。

線上：<https://recycle-ai-tw.vercel.app>
對應提案文件：[PRD](../PRD.md) · [SPEC](../SPEC.md)

---

## 功能

### 一般使用者
- 拍照 / 上傳一張廢棄物照片 → Cloudflare Turnstile 人機驗證 → Gemini 影像辨識 → 顯示處理指引
- **複合材質**（如手搖飲＝紙杯＋吸管＋封膜）自動拆解每個部件並分別給出處理方式
- 結果含信心度（高 / 中 / 低）、所屬大類、投入桶色、備註、法規依據
- 「回報分錯了」永久保留照片到後台供改善資料庫
- 支援臺北市 / 高雄市兩套處理規則
- 設定頁可選擇辨識來源：
  - **自帶 API Key**（Gemini API Key 僅在當次請求送出，不入庫）
  - **組織代號**（管理員配發；使用者不會看到實際 Key）

### 管理員（`/admin`）
- 儀表板：4 個 KPI + 物品大類分布柱狀圖 + 近 30 日辨識量折線圖，30 秒自動刷新
- 辨識紀錄：所有 recognition 文字記錄，分頁
- 異動回報：使用者「分錯了」的人工回報 + AI 不確定/失敗的自動歸檔，照片永久保留
- 組織代號管理：建立 / 編輯 / 啟停用 / 刪除（API Key 加密存 DB，從不回吐到前端）
- 修改密碼

---

## 架構

```
                    ┌─────────────────────────┐
                    │  Cloudflare Turnstile   │
                    └──────────▲──────────────┘
                               │ token
   ┌───────────┐  POST FormData  ┌──────────────────────────┐
   │  Browser  │ ──────────────▶ │   Next.js (Vercel)       │
   │           │                 │  /api/analyze            │
   └─────▲─────┘                 │   ─ verify Turnstile      │
         │ JSON                  │   ─ resolve key           │
         │                       │     (own / org → DB)      │
         │                       │   ─ call Gemini           │
         │                       │   ─ insert recognition    │
         │                       │   ─ if uncertain/error:   │
         │                       │       upload Blob +       │
         │                       │       insert error_report │
         │                       └────┬─────────────┬────────┘
                                      │             │
                            Gemini API│             │ Postgres / Blob
                                      ▼             ▼
                              Google AI         Vercel Storage
```

- **Postgres** 存：`recognition_records`、`error_reports`、`organizations`、`admin_settings`
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
| Auth | `jose` JWT cookie + `bcryptjs` |
| Bot check | Cloudflare Turnstile |
| Charts | `recharts` |
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

---

## 結構

```
v2/
├ app/
│  ├ page.tsx                    辨識主頁（Turnstile + /api/analyze）
│  ├ catalog/page.tsx            手動搜尋資料庫
│  ├ settings/page.tsx           API Key / 組織代號 / 縣市
│  ├ admin/
│  │  ├ login/                   不套用 (authed) layout
│  │  └ (authed)/                JWT cookie 才能進
│  │     ├ layout.tsx            sidebar 導覽
│  │     ├ page.tsx              儀表板
│  │     ├ records/              辨識紀錄
│  │     ├ reports/              異動回報（人工 + 自動）
│  │     ├ orgs/                 組織代號管理
│  │     └ change-password/
│  └ api/
│     ├ analyze/                 公開：辨識主端點
│     ├ report-error/            公開：人工回報（必附圖）
│     ├ orgs/validate/           公開：驗證組織代號（不回 key）
│     └ admin/                   middleware 保護
│        ├ login/  logout/  change-password/
│        ├ records/  reports/  stats/
│        ├ orgs/  orgs/[id]/
│        └ blob-proxy/           private Blob 照片 server-side proxy
├ components/
│  ├ ImageUploader.tsx           限 1 張，FileList snapshot 修復
│  ├ TurnstileWidget.tsx         Cloudflare Turnstile 包裝
│  ├ ResultCard.tsx              結果卡（含複合材質拆解）
│  ├ ReportDialog.tsx            「分錯了」對話框
│  ├ admin/                      AdminNav / StatsCharts
│  └ …
├ lib/
│  ├ types.ts                    共用 type
│  ├ catalog/
│  │  ├ items.json               廢棄物項目（目前 60+，目標 101）
│  │  └ rules/{taipei,kaohsiung}.json
│  ├ prompts.ts                  Gemini 提示詞（含複合材質範例）
│  ├ gemini-server.ts            伺服器端 Gemini 呼叫
│  ├ db.ts                       全部 SQL
│  ├ blob.ts                     上傳到 private Blob
│  ├ auth.ts                     JWT cookie + bcrypt
│  ├ turnstile.ts                CF siteverify
│  ├ image-resize.ts             客戶端縮圖避開 Vercel 4.5 MB body 上限
│  ├ storage.ts                  客戶端 localStorage 包裝
│  └ api-contracts.ts            前後端共用 request/response 形狀
├ middleware.ts                  保護 /admin/* 與 /api/admin/*
├ db/schema.sql                  CREATE TABLE IF NOT EXISTS + 遷移
└ scripts/init-db.ts             build 前自動跑 schema
```

---

## 資料庫綱要

```sql
recognition_records            -- 每次辨識的文字結果
  id, created_at, city_id, status, item_id, item_name,
  group_name, confidence, explanation,
  key_mode, org_code,            -- own/org 路由標記
  raw_response (jsonb)

error_reports                  -- 人工 + 自動歸檔
  id, created_at, recognition_id (FK), blob_url, blob_pathname,
  user_comment, reported_item_id, city_id,
  source                       -- manual / auto_uncertain / auto_error

organizations                  -- 組織代號（API key 加密存）
  id, code, name, api_key, active, created_at, updated_at

admin_settings                 -- 單列：管理員密碼 hash
  id=1, password_hash, updated_at
```

`source` 欄位驅動異動回報的 badge：
- 紅色「人工回報」（使用者主動回報分錯）
- 黃色「異動回報 · AI 不確定」
- 橘色「異動回報 · AI 失敗」

---

## 新增物品 / 縣市規則

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

---

## 安全注意事項

- 預設管理員密碼 `15ch00l5@M5vnG` 僅供初始部署；**生產上請務必登入後立即變更**。
- 組織 API Key 只存 server，前端永遠拿不到，`/api/orgs/validate` 也只回 `{ok, name?}`。
- Blob 是 private store，admin 看圖必須帶 cookie 走 `/api/admin/blob-proxy`，外部無法直接拉到 URL。
- `/api/admin/*` 與 `/admin/*` 由 [`middleware.ts`](middleware.ts) 統一以 JWT cookie 把關（login/logout 端點除外）。

---

## 變更歷程

- **v2.0** 純前端，純 client-side Gemini，API Key 僅在 localStorage
- **v2.1** 全端化：Postgres + Blob + Cloudflare Turnstile + 管理員後台 + 組織代號 + 異動回報自動歸檔 + 複合材質拆解 + 客戶端縮圖

---

## 授權與致謝

公民行動學期專題（臺北市數位實驗高中），分類規則僅供參考，**最終以各市環保局公告為準**。

資料骨架參考：[回收大百科](https://recycle.rethinktw.org/)
