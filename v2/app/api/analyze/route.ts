import { NextResponse, type NextRequest } from "next/server";
import {
  insertErrorReport,
  insertRecognition,
  getOrgByCode,
} from "@/lib/db";
import { uploadErrorReportImage } from "@/lib/blob";
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

    // 「不確定」與「錯誤」都自動歸檔成異動回報，照片永久保留供 admin 改善
    if (result.status === "uncertain" || result.status === "error") {
      try {
        const isUncertain = result.status === "uncertain";
        const filename =
          image instanceof File
            ? image.name
            : `${isUncertain ? "uncertain" : "error"}-${Date.now()}.jpg`;
        const { url, pathname } = await uploadErrorReportImage(
          image,
          filename,
        );

        let comment: string;
        if (isUncertain) {
          const partial =
            "partialName" in result && result.partialName
              ? `（AI 推測：${result.partialName}）`
              : "";
          comment = `[異動] AI 判斷為不確定${partial}`;
        } else {
          comment = `[異動] AI 辨識失敗：${result.message}`;
        }

        await insertErrorReport({
          recognitionId,
          blobUrl: url,
          blobPathname: pathname,
          userComment: comment,
          reportedItemId: null,
          cityId,
          source: isUncertain ? "auto_uncertain" : "auto_error",
        });
      } catch (e) {
        // 不要因為自動歸檔失敗而破壞主流程
        console.error("[/api/analyze] auto-report failed", e);
      }
    }

    const body: AnalyzeApiResponse = { recognitionId, result };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/analyze] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
