# Trashform v2 — `recycle-ai-tw`

[中文](README.md) · **English** · **Current version: v2.4** ([changelog](#changelog))

> A localized waste-sorting guide for Taiwan, closing the gap between everyday recycling knowledge and what each city actually accepts, by way of AI image recognition. Civic-action capstone, Taipei Municipal Experimental Senior High School of Digital Arts.

🌐 Live: <https://recycle-ai-tw.vercel.app>
📄 Proposal docs: [PRD](../PRD.md) · [SPEC](../SPEC.md)
📷 Screenshots & demo videos: [../回收網頁操作/](../回收網頁操作/)

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Local development](#local-development)
- [Deploying to Vercel](#deploying-to-vercel)
- [Project structure](#project-structure)
- [Database schema](#database-schema)
- [API endpoints](#api-endpoints)
- [Maintenance scripts](#maintenance-scripts)
- [Adding items / cities / eco-facts](#adding-items--cities--eco-facts)
- [Security notes](#security-notes)
- [Changelog](#changelog)

---

## Features

### For end users

#### Recognition flow
- Capture / pick one photo of a piece of waste.
- **Auto-recognize**: the analyze call fires automatically as soon as both the upload and the Cloudflare Turnstile check are complete — no more "Recognize" button.
- **Capture tips popup**: a quick checklist (clear subject, single item, good light, etc.) appears the first time the user taps to take a photo.
- **HEIC auto-conversion**: iPhone HEIC/HEIF is converted to JPEG client-side first; a server-side `heic-convert` fallback handles edge cases.
- **Client-side resize**: anything past 2560 px gets downsampled before upload to stay under Vercel's 4.5 MB serverless body limit.
- **Eco-facts ticker**: while the recognition takes 5–10 seconds, 1–3 random eco-facts rotate on the loading screen.

#### Result UI
- The result is presented as a **modal popup**; the key bits (item name, bin color) are big, and chatty copy is trimmed.
- **Composite-material breakdown**: things like "bubble-tea cup = paper cup + straw + sealing film" are split, each part with its own disposal note.
- Confidence (high / medium / low), category group, bin color, regulatory note.
- **Cross-city comparison**: the same item's disposal route in Taipei vs. Kaohsiung is shown side-by-side.
- "Wrong call" feedback keeps the photo permanently for admin review.
- Supports Taipei City + Kaohsiung City rules, switchable from the header at any time.

#### Auth modes
A popup lets the user pick:
- **Organization code** (recommended) — a teacher-issued code (e.g. `t202605`); the shared server-side Gemini key is used; students don't need their own API.
- **Bring-your-own Gemini API key** — stored in browser LocalStorage only; never sent to our server.

#### Retention features
- **IG + feedback form pills** always on the homepage.
- **First-success promo**: the first time a user gets an `identified` result on a given device, a modal asks them to follow IG or fill out the feedback form (fires once per device).
- **Add to home screen (PWA)**:
  - Android Chrome / Edge / Samsung: catches `beforeinstallprompt`, taps trigger the native install dialog.
  - iOS Safari: shows a "Share → Add to Home Screen" walkthrough (Safari doesn't expose programmatic install).
  - Hidden once running in `display-mode: standalone` (already installed).
  - 7-day cooldown after dismiss.
- **PWA launch splash**:
  - iOS: 13 pre-rendered `apple-touch-startup-image` PNGs cover every modern iPhone / iPad, eliminating the "homepage flashes before splash" issue caused by iOS using the last screenshot as a launch image.
  - Android: Chrome uses the manifest-based splash.
  - Once webview takes over, an in-page splash holds and cross-fades out for a seamless handoff.
- **Tutorial page**: device-aware media — phones see vertical screenshots & videos, desktops see the landscape versions.
- **Dynamic Island safe area**: every sticky header gets `padding-top: env(safe-area-inset-top)` so the top nav doesn't get eaten by the cutout in standalone mode.

#### Robustness
- **Rate-limit ≠ recognition error**: when Gemini returns 429 / quota, we skip the `recognition_records` and `error_reports` inserts entirely. The client shows a "System error" modal with a 5 s countdown and reloads.
- **Easter egg**: typing `67676767` in any API key input plays a sound clip from myinstants.

### For admins (`/admin`)

- **Dashboard**: 4 KPI tiles (total recognitions, accuracy estimate, uncertain count, error reports) + category-distribution bar chart + 30-day daily line chart. Stats endpoint has a 60 s in-memory cache to spare Neon CU.
- **Recognition records**: text-only browser, paginated.
- **Error reports**:
  - Manual user reports (`source = manual`)
  - Auto-archived uncertain results (`auto_uncertain`)
  - Auto-archived recognition failures (`auto_error`)
  - All photos kept permanently in private Vercel Blob.
- **Organization management**: create / edit / activate-deactivate / delete (API key encrypted at rest, never echoed to the client).
- **Eco-facts management**: full CRUD over the fact pool that the user-facing ticker reads from.
- **Rate-limit cleanup**: one-click button to scrub every "Gemini hit quota" auto-report row plus its blob and the corresponding recognition record.
- **Change password**.

### Image-storage optimization
- Every upload to private Blob is run through **sharp** first (max 1600 px long side, JPEG mozjpeg q75).
- Existing pre-compression blobs can be re-encoded in place via `scripts/compress-existing-blobs.ts` — in our deploy this took the total from 14.58 MB → 1.42 MB (-90.3%).

---

## Architecture

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

- **Postgres** holds: `recognition_records`, `error_reports`, `organizations`, `admin_settings`, `eco_facts`.
- **Blob (private)** keeps error-report photos forever.
- Admin photo views go through `/api/admin/blob-proxy?p=…` so the blob token is never sent to the browser.

---

## Tech stack

| Purpose | Package / service |
|---|---|
| Framework | Next.js 16 App Router (webpack) |
| UI | React 19 + Tailwind v4 (dark theme) |
| AI | `@google/generative-ai` (Gemini 2.5 Flash) |
| DB | `@vercel/postgres` (Neon) |
| Object storage | `@vercel/blob` v2 (private) |
| Image processing | `sharp` (compression), `heic-convert` (server HEIC fallback), `heic2any` (client HEIC) |
| Auth | `jose` JWT cookie + `bcryptjs` |
| Bot check | Cloudflare Turnstile |
| Charts | `recharts` |
| PWA | Custom `app/manifest.ts` + `public/sw.js` + script-generated apple-touch-startup-image set |
| Hosting | Vercel (Root Directory = `v2`) |

---

## Local development

```bash
git clone https://github.com/masonzeng702550/recycle-ai-tw.git
cd recycle-ai-tw/v2          # All source lives in v2/
npm install
cp .env.example .env.local   # Fill in the variables in the table below
npm run dev                  # http://localhost:3000
```

`POSTGRES_URL` / `BLOB_READ_WRITE_TOKEN` are marked sensitive in Vercel and won't come back from `vercel env pull`. Copy them manually from the Vercel Dashboard / Neon Console into `.env.local`.

```bash
npm run build   # Runs db:init (schema apply) + next build
npm run lint
```

`scripts/init-db.ts` runs automatically before each build. It's a no-op when `POSTGRES_URL` is missing, and every schema statement uses `IF NOT EXISTS / ADD COLUMN IF NOT EXISTS`, so it's safe to run repeatedly.

### Environment variables

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `POSTGRES_URL` | ✓ | Auto-injected by Vercel Postgres | DB connection |
| `BLOB_READ_WRITE_TOKEN` | ✓ | Auto-injected by Vercel Blob | Blob read / write |
| `JWT_SECRET` | ✓ | `openssl rand -base64 48` | Signs admin cookies |
| `ADMIN_USERNAME` | ✓ | You | Admin login |
| `ADMIN_PASSWORD` | bootstrap | You | First-deploy only; once you've changed the password from the admin UI it can be removed |
| `ADMIN_PASSWORD_HASH` | advanced | bcryptjs hash | Provide a hash directly (takes precedence over plain) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✓ | Cloudflare Turnstile | Client-side widget |
| `TURNSTILE_SECRET_KEY` | ✓ | Cloudflare Turnstile | Server-side siteverify |

---

## Deploying to Vercel

1. **Connect GitHub** — Project Settings → Git, link this repo.
2. **Root Directory** — Settings → General → `v2`.
3. **Storage** — Project → Storage:
   - Add **Postgres** (Neon) → Connect Project (auto-injects `POSTGRES_URL` & friends).
   - Add **Blob** (private store is fine) → Connect Project (auto-injects `BLOB_READ_WRITE_TOKEN`).
4. **Environment variables**:
   ```bash
   vercel env add JWT_SECRET production --value "$(openssl rand -base64 48)"
   vercel env add ADMIN_USERNAME production --value "your_username" --no-sensitive
   vercel env add ADMIN_PASSWORD production --value "initial_password"
   vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production --value "<site_key>" --no-sensitive
   vercel env add TURNSTILE_SECRET_KEY production --value "<secret_key>"
   ```
   Cloudflare Turnstile: <https://dash.cloudflare.com/?to=/:account/turnstile>, set Domain to your deploy URL.
5. **Push to main** → auto-deploy. The build runs the schema migrator before bundling.
6. **First login** at `/admin/login`. **Change the password immediately**; once you have, you can remove `ADMIN_PASSWORD` from the env.
7. **Seed eco-facts**: on first deploy you can import `db/eco-facts-seed.json` from the admin UI.

---

## Project structure

```
v2/
├ app/
│  ├ page.tsx                    Recognition page (auto-fire + Turnstile + /api/analyze)
│  ├ catalog/page.tsx            Manual database search
│  ├ settings/page.tsx           API key / org code / city
│  ├ tutorial/page.tsx           Walkthrough (device-aware media)
│  ├ layout.tsx                  Metadata + PWA splash inline boot script + safe-area
│  ├ manifest.ts                 PWA manifest (Next metadata route)
│  ├ admin/
│  │  ├ login/                   Outside the (authed) layout
│  │  └ (authed)/                Requires JWT cookie
│  │     ├ layout.tsx            Sidebar nav (with safe-area-inset-top)
│  │     ├ page.tsx              Dashboard (KPIs + charts)
│  │     ├ records/              Recognition history
│  │     ├ reports/              Error reports (incl. rate-limit cleanup button)
│  │     ├ orgs/                 Org code management
│  │     ├ eco-facts/            Eco-fact management
│  │     └ change-password/
│  └ api/
│     ├ analyze/                 Public: main recognition endpoint (429s do NOT hit DB)
│     ├ report-error/            Public: user report (photo required)
│     ├ orgs/validate/           Public: validate org code (never returns the key)
│     ├ eco-facts/               Public: fetch 1–5 random eco-facts
│     └ admin/                   Protected by middleware
│        ├ login/  logout/  change-password/
│        ├ records/  reports/  stats/
│        ├ orgs/  orgs/[id]/
│        ├ eco-facts/  eco-facts/[id]/
│        ├ cleanup-rate-limit/   Purge "Gemini hit quota" pollution
│        └ blob-proxy/           Server-side proxy for private blob
├ components/
│  ├ ImageUploader.tsx           Single photo, capture-tips popup, FileList-snapshot fix
│  ├ TurnstileWidget.tsx         Cloudflare Turnstile wrapper
│  ├ ResultCard.tsx              Result modal (composite breakdown + cross-city)
│  ├ ReportDialog.tsx            "Wrong call" dialog
│  ├ EcoFactsTicker.tsx          Mid-recognition eco-facts ticker
│  ├ SocialLinks.tsx             IG / feedback form pills
│  ├ FirstSuccessPromo.tsx       First-identified promo modal
│  ├ InstallAppButton.tsx        Add-to-home-screen (Android beforeinstallprompt + iOS walkthrough)
│  ├ ServiceWorkerRegister.tsx   /sw.js registrar
│  ├ SystemBusyModal.tsx         429 / RATE_LIMIT modal + auto-reload
│  ├ ApiKeyGate.tsx              Org code vs. own key chooser
│  ├ admin/                      AdminNav / StatsCharts
│  └ …
├ lib/
│  ├ types.ts                    Shared types (incl. ErrorResult.code = "RATE_LIMIT" | "INVALID_KEY")
│  ├ catalog/
│  │  ├ items.json               Waste items (60+, target 101)
│  │  └ rules/{taipei,kaohsiung}.json
│  ├ prompts.ts                  Gemini prompts (with composite-material examples)
│  ├ gemini-server.ts            Server-side Gemini call (incl. RATE_LIMIT detection)
│  ├ db.ts                       All SQL (recognition / report / org / eco-facts)
│  ├ blob.ts                     Upload to private Blob
│  ├ auth.ts                     JWT cookie + bcrypt
│  ├ turnstile.ts                CF siteverify
│  ├ image-resize.ts             Client-side resize for the 4.5 MB body cap
│  ├ image-compress.ts           Server-side sharp compress (1600 px / q75)
│  ├ heic-server.ts              Server HEIC → JPEG fallback
│  ├ easter-egg.ts               67676767 audio easter egg
│  ├ social.ts                   IG / feedback form URL constants
│  ├ storage.ts                  Client localStorage wrapper
│  ├ server-env.ts               Centralised env var access
│  └ api-contracts.ts            Shared request/response shapes
├ public/
│  ├ sw.js                       Minimal service worker (required for Chrome PWA install)
│  ├ icons/                      PWA icons + favicons
│  └ icons/splash/               13 apple-touch-startup-image PNGs
├ middleware.ts                  Protects /admin/* and /api/admin/*
├ db/
│  ├ schema.sql                  CREATE TABLE IF NOT EXISTS + migrations
│  └ eco-facts-seed.json         Eco-facts seed data
└ scripts/
   ├ init-db.ts                  Runs schema before build
   ├ blob-stats.ts               List error-reports/ blob count + total size
   ├ compress-existing-blobs.ts  One-shot re-encode of every existing blob
   ├ cleanup-rate-limit-records.ts  Local-shell version of the admin cleanup
   ├ db-stats.ts                 Postgres DB size + per-table row count
   ├ generate-pwa-icons.ts       sharp-renders 7 PWA / favicon PNGs from an SVG template
   └ generate-pwa-splash.ts      sharp-renders 13 iOS startup-image PNGs from an SVG template
```

---

## Database schema

```sql
recognition_records            -- Per-recognition text result
  id, created_at, city_id, status, item_id, item_name,
  group_name, confidence, explanation,
  key_mode, org_code,            -- own / org routing marker
  raw_response (jsonb)

error_reports                  -- Manual + auto-archive (rate-limit does NOT write here)
  id, created_at, recognition_id (FK), blob_url, blob_pathname,
  user_comment, reported_item_id, city_id,
  source                       -- manual / auto_uncertain / auto_error

organizations                  -- Org codes (encrypted API key)
  id, code, name, api_key, active, created_at, updated_at

eco_facts                      -- Eco-facts pool
  id, content, active, created_at, updated_at

admin_settings                 -- Single row: admin password hash
  id=1, password_hash, updated_at
```

The `source` column drives the report badge:
- Red "Manual report" — user said the recognition was wrong.
- Yellow "Auto · uncertain" — AI couldn't decide.
- Orange "Auto · failed" — AI errored.

---

## API endpoints

### Public
| Path | Method | Purpose |
|---|---|---|
| `/api/analyze` | POST | Main recognition (FormData: image + cityId + turnstileToken + keyMode + apiKey?/orgCode?) |
| `/api/report-error` | POST | User "wrong call" report (photo required) |
| `/api/orgs/validate` | POST | Validate org code (only returns `{ok, name?}`, never the key) |
| `/api/eco-facts` | GET | 1–5 random eco-facts |
| `/manifest.webmanifest` | GET | PWA manifest (generated by `app/manifest.ts`) |

### Admin (JWT cookie via middleware)
| Path | Method | Purpose |
|---|---|---|
| `/api/admin/login` | POST | Validate credentials, issue cookie |
| `/api/admin/logout` | POST | Clear cookie |
| `/api/admin/change-password` | POST | Update password |
| `/api/admin/stats` | GET | Dashboard data (60 s in-memory cache) |
| `/api/admin/records` | GET | Paginated recognition history |
| `/api/admin/reports` | GET | Paginated error reports |
| `/api/admin/orgs` | GET / POST | List & create organizations |
| `/api/admin/orgs/[id]` | PATCH / DELETE | Update, delete |
| `/api/admin/eco-facts` | GET / POST | List & create eco-facts |
| `/api/admin/eco-facts/[id]` | PATCH / DELETE | Update, delete |
| `/api/admin/cleanup-rate-limit` | POST | Purge 429 auto-archive pollution |
| `/api/admin/blob-proxy?p=…` | GET | Stream a private blob through admin auth |

---

## Maintenance scripts

| Script | Purpose | When to run |
|---|---|---|
| `scripts/init-db.ts` | Apply / migrate schema | Auto on each build (no-op without `POSTGRES_URL`) |
| `scripts/blob-stats.ts` | Total size + extension breakdown + Top 10 largest | Audit blob usage |
| `scripts/compress-existing-blobs.ts` | Re-encode every existing blob in place with sharp | First-time deploy compression / occasional cleanup |
| `scripts/cleanup-rate-limit-records.ts` | Shell-driven version of the admin cleanup | When `POSTGRES_URL` is reachable locally |
| `scripts/db-stats.ts` | Postgres size + per-table row count | Audit Neon usage |
| `scripts/generate-pwa-icons.ts` | sharp-render 7 PWA / favicon PNGs | Re-run if the logo changes |
| `scripts/generate-pwa-splash.ts` | sharp-render 13 iOS apple-touch-startup-image PNGs | Re-run if the logo or splash design changes |

How to run:
```bash
cd v2
vercel env pull .env.production.local
npx tsx scripts/<name>.ts
# or: set -a && . ./.env.production.local && set +a && npx tsx scripts/<name>.ts
```

---

## Adding items / cities / eco-facts

### Add an item
Edit [`lib/catalog/items.json`](lib/catalog/items.json):
```json
{ "id": "kebab_case_id", "nameZh": "中文名", "aliases": ["alias"], "group": "paper", "emoji": "📦" }
```
Then in `lib/catalog/rules/{city}.json` add an `items.<id>` block per city to override the disposal text (optional — without it, the entry falls back to `groupDefaults`).

### Add a city
1. Add `lib/catalog/rules/<cityId>.json` (follow the existing `taipei.json` shape).
2. Add the new value to `CityId` in `lib/types.ts`.
3. Add a chip to `components/CityPicker.tsx`.
4. Register it in `lib/catalog/index.ts`.

### Add an eco-fact
CRUD directly in `/admin/eco-facts`, or import the contents of `db/eco-facts-seed.json`.

---

## Security notes

- The bootstrap admin password `15ch00l5@M5vnG` is for first deploy only. **Change it from the UI as soon as you log in.**
- Org API keys live exclusively server-side; the client never sees them. `/api/orgs/validate` only echoes `{ok, name?}`.
- Blob is a private store; admin photo views go through `/api/admin/blob-proxy` (cookie-gated). The Blob URL is not directly fetchable.
- `/api/admin/*` and `/admin/*` are guarded by [`middleware.ts`](middleware.ts) (JWT cookie); the login and logout endpoints are the only exceptions.
- Cloudflare Turnstile gates every `/api/analyze` request to deter scrapers and abuse.
- Image compression runs server-side so a slow client doesn't have to upload a large file.
- Rate-limit errors don't write to the DB or Blob — preventing an attacker from inflating storage with a flood of failed requests.

---

## Changelog

Versions are framed by theme rather than calendar week — each one tackled a specific phase of the project.

| Version | Dates | Theme | Highlights |
|---|---|---|---|
| **v2.0** | 2026-04-29 | Frontend prototype | Next.js + React + Tailwind; client-side Gemini; API key only in LocalStorage; Taipei / Kaohsiung catalog and result UI scaffold. |
| **v2.1** | 2026-05-13 – 14 | Full-stack foundation | Whole stack rebuilt in a single day: Postgres + Blob + Cloudflare Turnstile + JWT admin dashboard; organization codes (shared server-side Gemini key — students don't need their own API); composite-material breakdown (bubble-tea cup = cup + straw + seal); HEIC → JPEG (client primary, server fallback); client-side resize to dodge the 4.5 MB body cap; auto-archive of uncertain / error recognitions. |
| **v2.2** | 2026-05-18 | Onboarding | Tutorial page: device-aware media that swaps between phone-shot and desktop-shot walkthroughs; header no longer wraps vertically on narrow phones. |
| **v2.3** | 2026-05-27 – 31 | Mobile-first + friction removal | Dual-option popup on first use (org code vs. bring-your-own key); server-side sharp compression (existing 19 blobs went 14.58 → 1.42 MB, −90%); auto-fire recognition on upload (the "Recognize" button is gone); rate-limit errors isolated from real recognition failures (no DB write, "System busy" modal auto-reloads); IG + feedback form pills on the home page + first-success promo modal; install-as-PWA (manifest + service worker + install button + iOS walkthrough); `67676767` easter egg in any API-key input. |
| **v2.4** (current) | 2026-06-01 – 04 | Result UX + social sharing | iPhone Dynamic Island safe-area handling (`env(safe-area-inset-top)`); PWA brand splash + `apple-touch-startup-image` ×13 device sizes; result rendered as a modal popup with the key bits enlarged; secondary info (AI reasoning, notes, cross-city comparison) collapsed behind `<details>`; cross-city disposal comparison; capture-tips popup before taking a photo; eco-facts pool with optional meme images + in-recognition ticker; IG Story + LINE share with message and 1080×1920 Canvas story templates; dashboard CSV / PDF export. |

Full history: `git log --oneline`.

---

## License & credits

A civic-action capstone of **Taipei Municipal Experimental Senior High School of Digital Arts**. The disposal rules are best-effort; **the cities' EPA notices are authoritative**.

- Data skeleton inspired by [回收大百科](https://recycle.rethinktw.org/).
- AI: Google Gemini 2.5 Flash.
- Hosted on Vercel + Neon + Cloudflare Turnstile.

Contact: [Instagram @trashform.team](https://www.instagram.com/trashform.team/) · [Feedback form](https://docs.google.com/forms/d/e/1FAIpQLSdylVR5SBsWxbGog3OFcfuAkdk51W-N0sQd-vX8o3GhdStKxQ/viewform)
