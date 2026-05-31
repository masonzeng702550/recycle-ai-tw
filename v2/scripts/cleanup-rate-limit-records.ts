// One-shot: remove "[異動] AI 辨識失敗：Gemini 已達上限或被限速" rows from
// the DB and their associated blob images. These are NOT recognition failures
// — Google rate-limited us — so they shouldn't count against accuracy stats
// or sit in the error_reports queue waiting for review.
//
// Strategy:
//   1. Find every error_reports row whose user_comment matches the rate-limit
//      pattern. Capture (id, blob_pathname, recognition_id).
//   2. Delete each blob from Vercel Blob (so storage shrinks too).
//   3. Delete the error_reports rows.
//   4. Delete the matching recognition_records rows. We restrict by status =
//      'error' so we never touch a successful identification by accident.
//   5. Print before/after summary.
//
// Run:
//   vercel env pull .env.production.local
//   npx tsx --env-file=.env.production.local scripts/cleanup-rate-limit-records.ts
//
// NOTE: The Vercel Postgres SDK reads POSTGRES_URL from process.env. If you
// see "missing_connection_string", run vercel env pull again and confirm the
// var is non-empty in .env.production.local before re-running.

import { del } from "@vercel/blob";
import { sql } from "@vercel/postgres";

const PATTERN = "%已達上限或被限速%";

async function main() {
  // 1. find candidates
  const candidates = await sql<{
    id: number;
    blob_pathname: string;
    recognition_id: number | null;
  }>`
    SELECT id, blob_pathname, recognition_id
    FROM error_reports
    WHERE user_comment LIKE ${PATTERN}
  `;
  console.log(`Found ${candidates.rows.length} rate-limit error_reports rows`);

  const recIds = candidates.rows
    .map((r) => r.recognition_id)
    .filter((n): n is number => n != null);

  // 2. delete blobs
  let blobOk = 0;
  let blobFail = 0;
  for (const r of candidates.rows) {
    try {
      await del(r.blob_pathname);
      blobOk += 1;
    } catch (e) {
      console.warn(`  blob del failed for ${r.blob_pathname}: ${(e as Error).message}`);
      blobFail += 1;
    }
  }
  console.log(`Blobs: ${blobOk} deleted, ${blobFail} failed`);

  // 3. delete error_reports rows
  const erDel = await sql`
    DELETE FROM error_reports WHERE user_comment LIKE ${PATTERN}
  `;
  console.log(`error_reports rows deleted: ${erDel.rowCount}`);

  // 4. delete matching recognition_records (only those still status='error')
  //    so we never touch identified/uncertain rows by mistake
  let recDel = 0;
  if (recIds.length > 0) {
    // @vercel/postgres doesn't accept arrays via tagged template binding,
    // so build a parametrised IN clause manually.
    const placeholders = recIds.map((_, i) => `$${i + 1}`).join(",");
    const query = `
      DELETE FROM recognition_records
      WHERE id IN (${placeholders}) AND status = 'error'
    `;
    const result = await sql.query(query, recIds);
    recDel = result.rowCount ?? 0;
  }
  console.log(`recognition_records rows deleted: ${recDel}`);

  // 5. summary
  const after = await sql<{ count: string }>`
    SELECT
      (SELECT COUNT(*) FROM recognition_records)::text AS rec_count,
      (SELECT COUNT(*) FROM recognition_records WHERE status = 'identified')::text AS identified_count,
      (SELECT COUNT(*) FROM recognition_records WHERE status = 'error')::text AS error_count,
      (SELECT COUNT(*) FROM error_reports)::text AS report_count
  `;
  console.log("=== after cleanup ===");
  console.log(after.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
