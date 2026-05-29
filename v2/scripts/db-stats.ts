// One-shot: print Postgres DB size and per-table row counts.

import { sql } from "@vercel/postgres";

async function main() {
  const dbSize = await sql<{ size: string; bytes: string }>`
    select pg_size_pretty(pg_database_size(current_database())) as size,
           pg_database_size(current_database())::text as bytes
  `;
  console.log(`db size: ${dbSize.rows[0].size} (${dbSize.rows[0].bytes} bytes)`);

  const tables = await sql<{ relname: string; size: string; n_live_tup: string }>`
    select c.relname,
           pg_size_pretty(pg_total_relation_size(c.oid)) as size,
           coalesce(s.n_live_tup, 0)::text as n_live_tup
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public' and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc
  `;
  console.log("tables:");
  for (const r of tables.rows) {
    console.log(`  ${r.relname.padEnd(24)} ${r.size.padStart(10)}  rows≈${r.n_live_tup}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
