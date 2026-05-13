import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearAdminCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/logout] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
