import { NextResponse, type NextRequest } from "next/server";
import { getRandomActiveEcoFacts } from "@/lib/db";
import type { EcoFactsResponse } from "@/lib/api-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 公開端點：辨識中畫面隨機抓 1~3 筆環保冷知識。
// 任何錯誤（DB 未設定 / 連線失敗）都回空陣列，不影響辨識主流程。
export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("count") ?? "3");
  const count = Number.isFinite(raw) ? Math.max(1, Math.min(Math.trunc(raw), 5)) : 3;
  try {
    const facts = await getRandomActiveEcoFacts(count);
    const body: EcoFactsResponse = { facts };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/eco-facts] failed", err);
    return NextResponse.json({ facts: [] } satisfies EcoFactsResponse);
  }
}
