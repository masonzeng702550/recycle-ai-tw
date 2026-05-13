import { NextResponse, type NextRequest } from "next/server";
import { createOrganization, listOrganizations } from "@/lib/db";
import type {
  AdminCreateOrgRequest,
  AdminOrgsResponse,
} from "@/lib/api-contracts";

export const runtime = "nodejs";

const CODE_RE = /^[a-zA-Z0-9-]{3,32}$/;

export async function GET() {
  try {
    const orgs = await listOrganizations();
    const body: AdminOrgsResponse = { orgs };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/admin/orgs GET] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | AdminCreateOrgRequest
      | null;
    const code = body?.code?.trim() ?? "";
    const name = body?.name?.trim() ?? "";
    const apiKey = body?.apiKey?.trim() ?? "";

    if (!code || !name || !apiKey) {
      return NextResponse.json(
        { error: "code、name、apiKey 皆必填。" },
        { status: 400 },
      );
    }
    if (!CODE_RE.test(code)) {
      return NextResponse.json(
        { error: "code 只能用英數與短橫線，長度 3-32。" },
        { status: 400 },
      );
    }

    try {
      const id = await createOrganization({ code, name, apiKey });
      return NextResponse.json({ id });
    } catch (e: unknown) {
      // Postgres unique violation = 23505
      const code23505 =
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "23505";
      const msg = e instanceof Error ? e.message : String(e);
      if (code23505 || /duplicate key|unique/i.test(msg)) {
        return NextResponse.json(
          { error: "組織代號已存在。" },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (err) {
    console.error("[/api/admin/orgs POST] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
