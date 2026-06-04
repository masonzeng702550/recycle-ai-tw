import { NextResponse, type NextRequest } from "next/server";
import { createEcoFact, listEcoFacts } from "@/lib/db";
import type {
  AdminCreateEcoFactRequest,
  AdminEcoFactsResponse,
} from "@/lib/api-contracts";

export const runtime = "nodejs";

const MAX_LEN = 200;

export async function GET() {
  try {
    const facts = await listEcoFacts();
    const body: AdminEcoFactsResponse = { facts };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/admin/eco-facts GET] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | AdminCreateEcoFactRequest
      | null;
    const content = body?.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "內容必填。" }, { status: 400 });
    }
    if (content.length > MAX_LEN) {
      return NextResponse.json(
        { error: `內容請勿超過 ${MAX_LEN} 字。` },
        { status: 400 },
      );
    }
    // imageUrl 可選：null / 空字串 / undefined 都當作沒梗圖
    const rawImg =
      typeof body?.imageUrl === "string" ? body.imageUrl.trim() : null;
    const imageUrl = rawImg ? rawImg : null;
    const id = await createEcoFact(content, imageUrl);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[/api/admin/eco-facts POST] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
