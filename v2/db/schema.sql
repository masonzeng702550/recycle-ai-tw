-- Trashform v2.1 schema
-- Apply via: `npm run db:init`，或在 Vercel Postgres 主控台手動執行

CREATE TABLE IF NOT EXISTS recognition_records (
  id              SERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  city_id         TEXT NOT NULL,
  status          TEXT NOT NULL,                       -- identified | uncertain | error
  item_id         TEXT,
  item_name       TEXT,
  group_name      TEXT,
  confidence      TEXT,
  explanation     TEXT,
  key_mode        TEXT NOT NULL,                       -- own | org
  org_code        TEXT,                                -- nullable
  client_hint     TEXT,                                -- 匿名 client hash（防濫用統計）
  raw_response    JSONB
);

CREATE INDEX IF NOT EXISTS idx_records_created    ON recognition_records (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_group      ON recognition_records (group_name);
CREATE INDEX IF NOT EXISTS idx_records_status     ON recognition_records (status);

CREATE TABLE IF NOT EXISTS error_reports (
  id                SERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recognition_id    INT REFERENCES recognition_records(id) ON DELETE SET NULL,
  blob_url          TEXT NOT NULL,                     -- 永久保留的圖片
  blob_pathname     TEXT NOT NULL,
  user_comment      TEXT,
  reported_item_id  TEXT,
  city_id           TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_created ON error_reports (created_at DESC);

-- v2.1.x：來源欄位（manual = 人工回報；auto_uncertain / auto_error = 異動回報）
ALTER TABLE error_reports
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- 把舊版 [自動] 前綴的人工分類列改成 auto_uncertain（idempotent — 第二次跑沒列符合）
UPDATE error_reports
  SET source = 'auto_uncertain'
  WHERE source = 'manual' AND user_comment LIKE '[自動]%';

CREATE INDEX IF NOT EXISTS idx_reports_source ON error_reports (source);

CREATE TABLE IF NOT EXISTS organizations (
  id              SERIAL PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,                -- 使用者輸入的代號
  name            TEXT NOT NULL,
  api_key         TEXT NOT NULL,                       -- 對應的 Gemini Key（僅伺服器讀）
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 單列管理員設定（密碼可從 admin UI 修改）
CREATE TABLE IF NOT EXISTS admin_settings (
  id              INT PRIMARY KEY DEFAULT 1,
  password_hash   TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT only_one_row CHECK (id = 1)
);
