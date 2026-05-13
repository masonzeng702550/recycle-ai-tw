import { NextResponse, type NextRequest } from "next/server";
import { deleteOrganization, updateOrganization } from "@/lib/db";
import type { AdminUpdateOrgRequest } from "@/lib/api-contracts";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (id == null) {
      return NextResponse.json({ error: "id 不合法。" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as
      | AdminUpdateOrgRequest
      | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "請求格式錯誤。" }, { status: 400 });
    }

    const patch: { name?: string; apiKey?: string; active?: boolean } = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.apiKey === "string") patch.apiKey = body.apiKey.trim();
    if (typeof body.active === "boolean") patch.active = body.active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "沒有任何可更新欄位。" },
        { status: 400 },
      );
    }

    await updateOrganization(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/orgs/:id PATCH] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (id == null) {
      return NextResponse.json({ error: "id 不合法。" }, { status: 400 });
    }
    await deleteOrganization(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/orgs/:id DELETE] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
