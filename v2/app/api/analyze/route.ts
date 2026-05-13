import { NextResponse, type NextRequest } from "next/server";
import { insertRecognition, getOrgByCode } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";
import { analyzeWithKey } from "@/lib/gemini-server";
import type { KeyMode } from "@/lib/types";
import type { AnalyzeApiResponse } from "@/lib/api-contracts";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return undefined;
  return xff.split(",")[0]?.trim() || undefined;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const image = form.get("image");
    const cityId = (form.get("cityId") as string | null) ?? "";
    const turnstileToken = (form.get("turnstileToken") as string | null) ?? "";
    const keyModeRaw = (form.get("keyMode") as string | null) ?? "";
    const apiKey = (form.get("apiKey") as string | null) ?? "";
    const orgCode = (form.get("orgCode") as string | null) ?? "";

    if (!(image instanceof Blob)) {
      return NextResponse.json({ error: "缺少圖片。" }, { status: 400 });
    }
    if (!cityId) {
      return NextResponse.json({ error: "缺少 cityId。" }, { status: 400 });
    }
    if (keyModeRaw !== "own" && keyModeRaw !== "org") {
      return NextResponse.json({ error: "keyMode 不合法。" }, { status: 400 });
    }
    const keyMode = keyModeRaw as KeyMode;

    // Turnstile
    const ts = await verifyTurnstile(turnstileToken, clientIp(req));
    if (!ts.ok) {
      return NextResponse.json(
        { error: `人機驗證失敗（${ts.reason ?? "unknown"}）。` },
        { status: 400 },
      );
    }

    // Resolve key
    let resolvedKey: string;
    let storedOrgCode: string | null = null;
    if (keyMode === "own") {
      if (!apiKey) {
        return NextResponse.json(
          { error: "缺少 apiKey。" },
          { status: 400 },
        );
      }
      resolvedKey = apiKey;
    } else {
      if (!orgCode) {
        return NextResponse.json(
          { error: "缺少組織代號。" },
          { status: 400 },
        );
      }
      const org = await getOrgByCode(orgCode);
      if (!org) {
        return NextResponse.json(
          { error: "組織代號無效或未啟用。" },
          { status: 400 },
        );
      }
      resolvedKey = org.apiKey;
      storedOrgCode = org.code;
    }

    // Call Gemini
    const result = await analyzeWithKey(resolvedKey, [image]);

    // Persist to DB regardless of status
    const recognitionId = await insertRecognition({
      cityId,
      status: result.status,
      itemId: result.status === "identified" ? result.itemId : null,
      itemName: result.status === "identified" ? result.itemName : null,
      groupName: result.status === "identified" ? result.group : null,
      confidence: result.status === "identified" ? result.confidence : null,
      explanation:
        result.status === "identified"
          ? result.explanation
          : result.status === "error"
            ? result.message
            : null,
      keyMode,
      orgCode: keyMode === "org" ? storedOrgCode : null,
      raw: result,
    });

    const body: AnalyzeApiResponse = { recognitionId, result };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/analyze] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
