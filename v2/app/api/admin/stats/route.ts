import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[/api/admin/stats] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
