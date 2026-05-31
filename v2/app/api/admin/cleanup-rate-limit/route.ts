// Admin one-shot: purge rate-limit auto-archived rows from error_reports +
// recognition_records and delete their blobs. Idempotent — running it again
// after success returns counts of 0. Auth comes from the global /admin
// middleware (JWT cookie required).

import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const maxDuration = 60;

const PATTERN = "%已達上限或被限速%";

export async function POST() {
  try {
    // 1. find rows in error_reports that came from rate-limit auto-archive
    const candidates = await sql<{
      id: number;
      blob_pathname: string;
      recognition_id: number | null;
    }>`
      SELECT id, blob_pathname, recognition_id
      FROM error_reports
      WHERE user_comment LIKE ${PATTERN}
    `;

    const total = candidates.rows.length;
    if (total === 0) {
      return NextResponse.json({
        ok: true,
        reportsDeleted: 0,
        blobsDeleted: 0,
        blobsFailed: 0,
        recognitionsDeleted: 0,
        message: "沒有符合的紀錄，無事可清。",
      });
    }

    // 2. delete blobs (best-effort: continue on individual failures)
    let blobsDeleted = 0;
    let blobsFailed = 0;
    for (const r of candidates.rows) {
      try {
        await del(r.blob_pathname);
        blobsDeleted += 1;
      } catch (e) {
        console.warn(
          `[cleanup-rate-limit] blob del failed: ${r.blob_pathname}`,
          e,
        );
        blobsFailed += 1;
      }
    }

    // 3. delete error_reports rows by the same predicate (atomic by SQL)
    const erDel = await sql`
      DELETE FROM error_reports WHERE user_comment LIKE ${PATTERN}
    `;
    const reportsDeleted = erDel.rowCount ?? 0;

    // 4. delete the recognition_records rows that triggered them. Restrict
    //    to status='error' so we never touch a real identified/uncertain
    //    record by accident.
    const recIds = candidates.rows
      .map((r) => r.recognition_id)
      .filter((n): n is number => n != null);

    let recognitionsDeleted = 0;
    if (recIds.length > 0) {
      const placeholders = recIds.map((_, i) => `$${i + 1}`).join(",");
      const query = `
        DELETE FROM recognition_records
        WHERE id IN (${placeholders}) AND status = 'error'
      `;
      const result = await sql.query(query, recIds);
      recognitionsDeleted = result.rowCount ?? 0;
    }

    return NextResponse.json({
      ok: true,
      reportsDeleted,
      blobsDeleted,
      blobsFailed,
      recognitionsDeleted,
    });
  } catch (err) {
    console.error("[/api/admin/cleanup-rate-limit POST] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
