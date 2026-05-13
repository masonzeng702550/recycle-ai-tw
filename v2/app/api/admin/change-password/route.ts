import { NextResponse, type NextRequest } from "next/server";
import {
  changeAdminPassword,
  issueSessionToken,
  setAdminCookie,
  verifyCredentials,
} from "@/lib/auth";
import { env } from "@/lib/server-env";
import type { AdminChangePasswordRequest } from "@/lib/api-contracts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | AdminChangePasswordRequest
      | null;
    const current = body?.current ?? "";
    const next = body?.next ?? "";

    if (!current || !next) {
      return NextResponse.json(
        { error: "請提供目前密碼與新密碼。" },
        { status: 400 },
      );
    }
    if (next.length < 12) {
      return NextResponse.json(
        { error: "新密碼長度至少 12 字元。" },
        { status: 400 },
      );
    }

    const ok = await verifyCredentials(env.adminUsername(), current);
    if (!ok) {
      return NextResponse.json(
        { error: "目前密碼不正確。" },
        { status: 401 },
      );
    }

    await changeAdminPassword(next);
    // 重新發 cookie，避免舊 session 因為密碼換了感覺奇怪
    const token = await issueSessionToken();
    await setAdminCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/change-password] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
