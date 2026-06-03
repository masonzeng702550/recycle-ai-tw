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

  // 環保冷知識種子：僅在資料表為空時匯入，避免覆蓋後台新增 / 重複種子。
  const { rows } = await sql.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM eco_facts",
  );
  const existing = Number(rows[0]?.count ?? 0);
  if (existing === 0) {
    const seedText = readFileSync(
      join(process.cwd(), "db", "eco-facts-seed.json"),
      "utf8",
    );
    const seed = JSON.parse(seedText) as string[];
    // 一次性多列 INSERT，用 $1,$2,... 參數化避免 SQL injection。
    const values = seed.map((_, i) => `($${i + 1})`).join(",");
    await sql.query(`INSERT INTO eco_facts (content) VALUES ${values}`, seed);
    console.log(`[init-db] ✓ seeded ${seed.length} eco facts`);
  } else {
    console.log(`[init-db] eco_facts already has ${existing} rows — skip seed`);
  }
}

main().catch((err) => {
  console.error("[init-db] failed:", err);
  process.exit(1);
});
