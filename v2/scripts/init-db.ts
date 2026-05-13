// 一鍵套用 db/schema.sql 到 Vercel Postgres
// 用法：
//   1. 先 `vercel env pull .env.local`（拉到 POSTGRES_URL）
//   2. `npm run db:init`

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "@vercel/postgres";

async function main() {
  const sqlText = readFileSync(
    join(process.cwd(), "db", "schema.sql"),
    "utf8",
  );
  // @vercel/postgres 的 sql tag 不支援多語句一次跑，改用 query
  await sql.query(sqlText);
  console.log("✓ schema applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
