import { NextResponse, type NextRequest } from "next/server";
import {
  issueSessionToken,
  setAdminCookie,
  verifyCredentials,
} from "@/lib/auth";
import type { AdminLoginRequest } from "@/lib/api-contracts";

export const runtime = "nodejs";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | AdminLoginRequest
      | null;
    const username = body?.username ?? "";
    const password = body?.password ?? "";
    if (!username || !password) {
      await delay(500);
      return NextResponse.json(
        { ok: false, error: "請輸入帳號與密碼。" },
        { status: 400 },
      );
    }

    const ok = await verifyCredentials(username, password);
    if (!ok) {
      await delay(500);
      return NextResponse.json(
        { ok: false, error: "帳號或密碼錯誤。" },
        { status: 401 },
      );
    }

    const token = await issueSessionToken();
    await setAdminCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/login] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
