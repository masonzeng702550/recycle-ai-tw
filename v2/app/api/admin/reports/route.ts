import { NextResponse, type NextRequest } from "next/server";
import { listErrorReports } from "@/lib/db";
import type { AdminReportsResponse } from "@/lib/api-contracts";

export const runtime = "nodejs";

function parseIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return fallback;
  return n;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseIntParam(searchParams.get("limit"), 100);
    const offset = parseIntParam(searchParams.get("offset"), 0);
    const reports = await listErrorReports({ limit, offset });
    const body: AdminReportsResponse = { reports };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/admin/reports] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
