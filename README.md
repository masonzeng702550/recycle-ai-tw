# Trashform — `recycle-ai-tw`

**中文** · [English](#english) · **目前版本：v2.4**（[變更歷程](#變更歷程)）

> 以 AI 影像辨識彌補民眾廢棄物分類認知落差 — 涵蓋日常回收與淨灘場域之在地化指引系統。臺北市數位實驗高中公民行動學期專題。

🌐 線上：<https://recycle-ai-tw.vercel.app>
📄 提案文件：[PRD](PRD.md) · [SPEC](SPEC.md)
📷 操作截圖與影片：[`回收網頁操作/`](回收網頁操作/)

技術文件（架構、API、環境變數、部署步驟）：[v2/README.md](v2/README.md) · [v2/README.en.md](v2/README.en.md)

---

## 倉庫結構

- **[`v2/`](v2/)** — 目前主要版本，全端 Next.js + Postgres + Vercel Blob。所有開發都在這裡。詳細功能、架構、env、部署步驟見 [`v2/README.md`](v2/README.md)。
- [`v1/`](v1/) — 早期前端原型，已不維護。
- [`PRD.md`](PRD.md) / [`SPEC.md`](SPEC.md) — 專題的產品需求文件與技術規格。
- [`回收網頁操作/`](回收網頁操作/) — 各介面在手機 / 桌機的截圖與操作影片。

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

---

<a id="english"></a>

# Trashform — `recycle-ai-tw` (English)

[中文](#trashform--recycle-ai-tw) · **English** · **Current version: v2.4** ([changelog](#changelog))

> A localized waste-sorting guide for Taiwan, closing the gap between everyday recycling knowledge and what each city actually accepts, by way of AI image recognition. Civic-action capstone, Taipei Municipal Experimental Senior High School of Digital Arts.

🌐 Live: <https://recycle-ai-tw.vercel.app>
📄 Proposal docs: [PRD](PRD.md) · [SPEC](SPEC.md)
📷 Screenshots & demo videos: [`回收網頁操作/`](回收網頁操作/)

Tech docs (architecture, API, env vars, deploy): [v2/README.md](v2/README.md) (Chinese) · [v2/README.en.md](v2/README.en.md) (English)

## Repository layout

- **[`v2/`](v2/)** — current production version, full-stack Next.js + Postgres + Vercel Blob. All development happens here. See [`v2/README.en.md`](v2/README.en.md) for features, architecture, env vars, and deploy steps.
- [`v1/`](v1/) — early front-end prototype, unmaintained.
- [`PRD.md`](PRD.md) / [`SPEC.md`](SPEC.md) — product requirements and technical specs.
- [`回收網頁操作/`](回收網頁操作/) — UI screenshots and demo videos for phone and desktop.

## Changelog

Versions are framed by theme rather than calendar week — each one tackled a specific phase of the project.

### v2.0 · Frontend prototype (2026-04-29)

- **Identifies objects in photos with the AI freely composing its own reply; does not support composite materials yet.**
- Pure front-end stack (Next.js + React + Tailwind), no backend at all.
- Gemini API called from the browser; key only in LocalStorage, never sent to our server.
- Bundled with Taipei / Kaohsiung catalogs and a basic result page.

### v2.1 · Full-stack foundation (2026-05-13 – 14)

- **Composite-material recognition** — for items made of multiple materials (e.g. a bubble-tea cup = paper cup + straw + sealing film), the AI now decomposes the object and emits a disposal note for each part.
- Whole stack rebuilt in a single day: Postgres + Blob + Cloudflare Turnstile + JWT admin dashboard.
- Organization-code system — teachers issue a code (e.g. `t202605`) and students don't need their own Gemini API key; the shared server-side key is used behind the scenes.
- iPhone HEIC / HEIF photos are auto-converted to JPEG (client primary, server fallback) so users never have to think about format.
- The client downsamples photos > 2560 px before upload to stay under Vercel serverless' 4.5 MB body cap.
- Uncertain / failed recognitions auto-archive to the admin error-reports queue with the original photo retained for later catalog improvement.

### v2.2 · Onboarding (2026-05-18)

- New tutorial page that automatically swaps between phone-shot and desktop-shot walkthrough media based on the visitor's device.
- Header nav stops wrapping vertically on narrow phones, cleaning up the chrome.

### v2.3 · Mobile-first + friction removal (2026-05-27 – 31)

- First-visit popup is now a binary choice: use the organization code (shared server key) or paste your own Gemini API key; copy spells out `t202605` so students don't read it as placeholder text.
- Server-side sharp compression for every upload going to Blob (≤1600 px / JPEG q75), plus a one-shot migration of the existing 19 historical blobs — total error-report storage went 14.58 MB → 1.42 MB (−90%).
- Recognition fires automatically the moment the photo and Cloudflare Turnstile are both ready; the "Recognize" button is gone, removing a tap of friction.
- Rate-limit errors (Gemini 429) are now isolated from real recognition errors — they do not write the DB or pollute stats; the client shows a "System error" modal that counts down 5 s and reloads. A one-click admin button cleans up any pre-existing pollution.
- **Social-account link button added on the home page to grow project exposure** (IG `@trashform.team` gradient pill).
- **Feedback-form link button added on the home page to encourage feedback submissions** (Google Form pill).
- First-success modal — the first time a device gets an identified result, a one-shot popup nudges the user to follow IG or fill the feedback form.
- **"Add to home screen" install flow guides users to install the PWA, raising the chance the tool keeps getting used** — Android Chrome triggers the native install dialog; iOS Safari shows a "Share → Add to Home Screen" three-step walkthrough; the button hides itself once `display-mode: standalone` is detected.
- Easter egg: typing `67676767` into any API-key input plays a sound clip.

### v2.4 · Result UX + social sharing (current, 2026-06-01 – 04)

- Fixed: in iPhone standalone PWA, the top nav was being half-eaten by the Dynamic Island; sticky headers now respect `env(safe-area-inset-top)` so the background extends behind the cutout.
- PWA launch transition — a custom brand splash plus 13 sizes of `apple-touch-startup-image` cover every modern iPhone / iPad, eliminating the "homepage flashes for a frame before the splash" issue on iOS.
- Recognition results render as a modal popup so users don't miss them.
- **Typography enlarged across the result UI for clarity** — item name, disposal method, and bin colour are bigger; verbose explanatory copy was trimmed.
- Secondary info (AI reasoning, notes, cross-city differences) collapsed behind `<details>`, leaving only "category / disposal / bin" on the primary view.
- Side-by-side cross-city disposal comparison — users on Taipei can see Kaohsiung's handling of the same item at a glance.
- Capture-tips popup before the photo is taken (clear subject, single item, good light, …) to boost first-attempt accuracy.
- New eco-facts pool (admin CRUD, each fact optionally pairs with a Chinese meme image), with 1–3 random facts rotating during recognition wait.
- One-tap share-to-Instagram-Story / share-to-LINE on mobile: client-side Canvas renders a 1080×1920 story image with brand logo, URL pill, and `@trashform.team` baked in; the URL is copied to the clipboard for IG's link sticker; LINE share uses the official URL scheme to pre-fill the message.
- Dashboard export — a CSV download button plus a print-friendly report page covering KPI table, category bar chart, daily line chart and full breakdowns; the browser's native "Save as PDF" closes the loop.

Full history: `git log --oneline`.

## License & credits

A civic-action capstone of **Taipei Municipal Experimental Senior High School of Digital Arts**. The disposal rules are best-effort; **the cities' EPA notices are authoritative**.

- Data skeleton inspired by [回收大百科](https://recycle.rethinktw.org/).
- AI: Google Gemini 2.5 Flash.
- Hosted on Vercel + Neon + Cloudflare Turnstile.

Contact: [Instagram @trashform.team](https://www.instagram.com/trashform.team/) · [Feedback form](https://docs.google.com/forms/d/e/1FAIpQLSdylVR5SBsWxbGog3OFcfuAkdk51W-N0sQd-vX8o3GhdStKxQ/viewform)
