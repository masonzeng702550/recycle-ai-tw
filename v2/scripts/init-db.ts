// 套用 db/schema.sql 到 Vercel Postgres。schema 用 IF NOT EXISTS
// 所以重複跑安全。被綁在 build script，每次部署都會跑一次。
//
// 本機手動：
//   1. 先 `vercel env pull .env.local`（POSTGRES_URL 會是 sensitive 拿不到，
//      請去 Vercel 主控台複製貼上）
//   2. `npm run db:init`

import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.warn(
      "[init-db] POSTGRES_URL not set — skipping schema init " +
        "(set it in env to enable).",
    );
    return;
  }
  // 動態 import，避免本機沒裝 dep 時 build 直接死
  const { sql } = await import("@vercel/postgres");
  const sqlText = readFileSync(
    join(process.cwd(), "db", "schema.sql"),
    "utf8",
  );
  await sql.query(sqlText);
  console.log("[init-db] ✓ schema applied");
}

main().catch((err) => {
  console.error("[init-db] failed:", err);
  process.exit(1);
});
