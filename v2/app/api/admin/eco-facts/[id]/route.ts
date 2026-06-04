import { NextResponse, type NextRequest } from "next/server";
import { deleteEcoFact, updateEcoFact } from "@/lib/db";
import type { AdminUpdateEcoFactRequest } from "@/lib/api-contracts";

export const runtime = "nodejs";

const MAX_LEN = 200;

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
      | AdminUpdateEcoFactRequest
      | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "請求格式錯誤。" }, { status: 400 });
    }

    const patch: {
      content?: string;
      imageUrl?: string | null;
      active?: boolean;
    } = {};
    if (typeof body.content === "string") {
      const content = body.content.trim();
      if (!content) {
        return NextResponse.json({ error: "內容不可為空。" }, { status: 400 });
      }
      if (content.length > MAX_LEN) {
        return NextResponse.json(
          { error: `內容請勿超過 ${MAX_LEN} 字。` },
          { status: 400 },
        );
      }
      patch.content = content;
    }
    // imageUrl：明確帶 null / 空字串 → 清空梗圖；帶字串 → 更新；不帶 → 不動
    if ("imageUrl" in body) {
      const v =
        typeof body.imageUrl === "string" ? body.imageUrl.trim() : null;
      patch.imageUrl = v ? v : null;
    }
    if (typeof body.active === "boolean") patch.active = body.active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "沒有任何可更新欄位。" },
        { status: 400 },
      );
    }

    await updateEcoFact(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/eco-facts/:id PATCH] unexpected", err);
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
    await deleteEcoFact(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/eco-facts/:id DELETE] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
