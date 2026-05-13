import { NextResponse, type NextRequest } from "next/server";
import { getOrgByCode } from "@/lib/db";
import type {
  OrgValidateRequest,
  OrgValidateResponse,
} from "@/lib/api-contracts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | OrgValidateRequest
      | null;
    const code = body?.code?.trim();
    if (!code) {
      const resp: OrgValidateResponse = { ok: false };
      return NextResponse.json(resp);
    }
    const org = await getOrgByCode(code);
    if (!org) {
      const resp: OrgValidateResponse = { ok: false };
      return NextResponse.json(resp);
    }
    const resp: OrgValidateResponse = { ok: true, name: org.name };
    return NextResponse.json(resp);
  } catch (err) {
    console.error("[/api/orgs/validate] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
