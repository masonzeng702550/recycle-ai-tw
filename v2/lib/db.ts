// Vercel Postgres wrapper。所有對 DB 的存取都經過這裡，方便管理欄位轉換。

import "server-only";
import { sql } from "@vercel/postgres";
import type {
  AdminStats,
  ErrorReportRecord,
  ErrorReportSource,
  KeyMode,
  OrgPublicInfo,
  RecognitionRecord,
} from "./types";

// ─── recognition_records ──────────────────────────────────

export interface NewRecognition {
  cityId: string;
  status: "identified" | "uncertain" | "error";
  itemId?: string | null;
  itemName?: string | null;
  groupName?: string | null;
  confidence?: string | null;
  explanation?: string | null;
  keyMode: KeyMode;
  orgCode?: string | null;
  clientHint?: string | null;
  raw?: unknown;
}

export async function insertRecognition(r: NewRecognition): Promise<number> {
  const { rows } = await sql<{ id: number }>`
    INSERT INTO recognition_records
      (city_id, status, item_id, item_name, group_name, confidence,
       explanation, key_mode, org_code, client_hint, raw_response)
    VALUES
      (${r.cityId}, ${r.status}, ${r.itemId ?? null}, ${r.itemName ?? null},
       ${r.groupName ?? null}, ${r.confidence ?? null}, ${r.explanation ?? null},
       ${r.keyMode}, ${r.orgCode ?? null}, ${r.clientHint ?? null},
       ${JSON.stringify(r.raw ?? null)}::jsonb)
    RETURNING id
  `;
  return rows[0].id;
}

export async function listRecognitions(opts?: {
  limit?: number;
  offset?: number;
}): Promise<RecognitionRecord[]> {
  const limit = Math.min(opts?.limit ?? 100, 500);
  const offset = opts?.offset ?? 0;
  const { rows } = await sql`
    SELECT id, created_at, city_id, status, item_id, item_name,
           group_name, confidence, explanation, key_mode, org_code
    FROM recognition_records
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map(rowToRecognition);
}

function rowToRecognition(r: Record<string, unknown>): RecognitionRecord {
  return {
    id: r.id as number,
    createdAt: (r.created_at as Date).toISOString(),
    cityId: r.city_id as string,
    status: r.status as RecognitionRecord["status"],
    itemId: (r.item_id as string | null) ?? null,
    itemName: (r.item_name as string | null) ?? null,
    groupName: (r.group_name as string | null) ?? null,
    confidence: (r.confidence as string | null) ?? null,
    explanation: (r.explanation as string | null) ?? null,
    keyMode: r.key_mode as KeyMode,
    orgCode: (r.org_code as string | null) ?? null,
  };
}

// ─── error_reports ────────────────────────────────────────

export interface NewErrorReport {
  recognitionId?: number | null;
  blobUrl: string;
  blobPathname: string;
  userComment?: string | null;
  reportedItemId?: string | null;
  cityId?: string | null;
  source?: ErrorReportSource; // 預設 'manual'
}

export async function insertErrorReport(r: NewErrorReport): Promise<number> {
  const source: ErrorReportSource = r.source ?? "manual";
  const { rows } = await sql<{ id: number }>`
    INSERT INTO error_reports
      (recognition_id, blob_url, blob_pathname, user_comment,
       reported_item_id, city_id, source)
    VALUES
      (${r.recognitionId ?? null}, ${r.blobUrl}, ${r.blobPathname},
       ${r.userComment ?? null}, ${r.reportedItemId ?? null},
       ${r.cityId ?? null}, ${source})
    RETURNING id
  `;
  return rows[0].id;
}

export async function listErrorReports(opts?: {
  limit?: number;
  offset?: number;
}): Promise<ErrorReportRecord[]> {
  const limit = Math.min(opts?.limit ?? 100, 500);
  const offset = opts?.offset ?? 0;
  const { rows } = await sql`
    SELECT id, created_at, recognition_id, blob_url, blob_pathname,
           user_comment, reported_item_id, city_id, source
    FROM error_reports
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map((r): ErrorReportRecord => ({
    id: r.id as number,
    createdAt: (r.created_at as Date).toISOString(),
    recognitionId: (r.recognition_id as number | null) ?? null,
    blobUrl: r.blob_url as string,
    blobPathname: r.blob_pathname as string,
    userComment: (r.user_comment as string | null) ?? null,
    reportedItemId: (r.reported_item_id as string | null) ?? null,
    cityId: (r.city_id as string | null) ?? null,
    source: (r.source as ErrorReportSource) ?? "manual",
  }));
}

// ─── organizations ────────────────────────────────────────

export interface OrgWithKey extends OrgPublicInfo {
  id: number;
  apiKey: string;
}

export async function getOrgByCode(code: string): Promise<OrgWithKey | null> {
  const { rows } = await sql`
    SELECT id, code, name, api_key, active
    FROM organizations
    WHERE code = ${code} AND active = TRUE
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as number,
    code: r.code as string,
    name: r.name as string,
    apiKey: r.api_key as string,
    active: r.active as boolean,
  };
}

export async function listOrganizations(): Promise<
  (OrgPublicInfo & { id: number; createdAt: string })[]
> {
  const { rows } = await sql`
    SELECT id, code, name, active, created_at
    FROM organizations
    ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    id: r.id as number,
    code: r.code as string,
    name: r.name as string,
    active: r.active as boolean,
    createdAt: (r.created_at as Date).toISOString(),
  }));
}

export async function createOrganization(input: {
  code: string;
  name: string;
  apiKey: string;
}): Promise<number> {
  const { rows } = await sql<{ id: number }>`
    INSERT INTO organizations (code, name, api_key)
    VALUES (${input.code}, ${input.name}, ${input.apiKey})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateOrganization(
  id: number,
  patch: { name?: string; apiKey?: string; active?: boolean },
): Promise<void> {
  // 因為 @vercel/postgres 的 sql tag 不好做動態 SET 子句，逐欄更新
  if (patch.name !== undefined) {
    await sql`UPDATE organizations SET name = ${patch.name}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (patch.apiKey !== undefined) {
    await sql`UPDATE organizations SET api_key = ${patch.apiKey}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (patch.active !== undefined) {
    await sql`UPDATE organizations SET active = ${patch.active}, updated_at = NOW() WHERE id = ${id}`;
  }
}

export async function deleteOrganization(id: number): Promise<void> {
  await sql`DELETE FROM organizations WHERE id = ${id}`;
}

// ─── admin_settings ───────────────────────────────────────

export async function getAdminPasswordHash(): Promise<string | null> {
  const { rows } = await sql`SELECT password_hash FROM admin_settings WHERE id = 1`;
  if (rows.length === 0) return null;
  return rows[0].password_hash as string;
}

export async function setAdminPasswordHash(hash: string): Promise<void> {
  await sql`
    INSERT INTO admin_settings (id, password_hash, updated_at)
    VALUES (1, ${hash}, NOW())
    ON CONFLICT (id) DO UPDATE SET password_hash = ${hash}, updated_at = NOW()
  `;
}

// ─── 統計 ─────────────────────────────────────────────────

export async function getStats(days = 30): Promise<AdminStats> {
  const [totals, groups, byDay, reports] = await Promise.all([
    sql`
      SELECT status, COUNT(*)::int AS count
      FROM recognition_records
      GROUP BY status
    `,
    sql`
      SELECT group_name, COUNT(*)::int AS count
      FROM recognition_records
      WHERE group_name IS NOT NULL
      GROUP BY group_name
      ORDER BY count DESC
    `,
    sql`
      SELECT TO_CHAR(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count
      FROM recognition_records
      WHERE created_at >= NOW() - (${days}::int || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `,
    sql`SELECT COUNT(*)::int AS count FROM error_reports`,
  ]);

  const counts: Record<string, number> = {};
  for (const r of totals.rows) counts[r.status as string] = r.count as number;
  const identified = counts.identified ?? 0;
  const uncertain = counts.uncertain ?? 0;
  const errored = counts.error ?? 0;
  const reportCount = (reports.rows[0]?.count as number) ?? 0;

  const accuracyEstimate =
    identified > 0 ? Math.max(0, 1 - reportCount / identified) : null;

  return {
    totalRecognitions: identified + uncertain + errored,
    identifiedCount: identified,
    uncertainCount: uncertain,
    errorCount: errored,
    reportCount,
    byGroup: groups.rows.map((r) => ({
      group: r.group_name as string,
      count: r.count as number,
    })),
    byDay: byDay.rows.map((r) => ({
      day: r.day as string,
      count: r.count as number,
    })),
    accuracyEstimate,
  };
}
