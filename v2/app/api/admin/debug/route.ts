// 暫時除錯端點：戳 Blob 與 error_reports 看哪一步壞掉
// 路徑被 middleware 保護，需要 admin cookie 才能用
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { put } from "@vercel/blob";
import { insertErrorReport, listErrorReports } from "@/lib/db";

export const runtime = "nodejs";

interface Step {
  step: string;
  ok: boolean;
  detail?: unknown;
}

async function safe<T>(name: string, fn: () => Promise<T>): Promise<Step> {
  try {
    const detail = await fn();
    return { step: name, ok: true, detail };
  } catch (e) {
    return {
      step: name,
      ok: false,
      detail:
        e instanceof Error
          ? { name: e.name, message: e.message, stack: e.stack?.slice(0, 800) }
          : String(e),
    };
  }
}

export async function GET() {
  const out: Step[] = [];

  out.push(
    await safe("env", async () => ({
      hasPostgres: Boolean(process.env.POSTGRES_URL),
      hasBlob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    })),
  );

  // 看欄位是否存在
  out.push(
    await safe("describe error_reports", async () => {
      const { rows } = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'error_reports'
        ORDER BY ordinal_position
      `;
      return rows;
    }),
  );

  out.push(
    await safe("count rows", async () => {
      const { rows } = await sql`SELECT COUNT(*)::int AS n FROM error_reports`;
      return rows[0];
    }),
  );

  // 試傳 Blob
  let blobUrl: string | null = null;
  let blobPath: string | null = null;
  out.push(
    await safe("blob put", async () => {
      const tiny = new Blob(["hello-debug"], { type: "text/plain" });
      const result = await put(`debug/${Date.now()}.txt`, tiny, {
        access: "public",
        addRandomSuffix: false,
      });
      blobUrl = result.url;
      blobPath = result.pathname;
      return { url: result.url, pathname: result.pathname };
    }),
  );

  // 試 insert
  if (blobUrl && blobPath) {
    const url = blobUrl;
    const path = blobPath;
    out.push(
      await safe("insertErrorReport(manual)", async () => {
        const id = await insertErrorReport({
          blobUrl: url,
          blobPathname: path,
          userComment: "[debug] manual probe",
          source: "manual",
        });
        return { id };
      }),
    );

    out.push(
      await safe("insertErrorReport(auto_uncertain)", async () => {
        const id = await insertErrorReport({
          blobUrl: url,
          blobPathname: path,
          userComment: "[debug] auto_uncertain probe",
          source: "auto_uncertain",
        });
        return { id };
      }),
    );
  }

  out.push(
    await safe("listErrorReports", async () => {
      const reports = await listErrorReports({ limit: 5 });
      return { count: reports.length, sample: reports };
    }),
  );

  return NextResponse.json(out);
}
