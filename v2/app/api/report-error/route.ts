import { NextResponse, type NextRequest } from "next/server";
import { insertErrorReport } from "@/lib/db";
import { uploadErrorReportImage } from "@/lib/blob";
import type { ReportErrorApiResponse } from "@/lib/api-contracts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const image = form.get("image");
    const recognitionIdRaw = form.get("recognitionId");
    const reportedItemId = (form.get("reportedItemId") as string | null) ?? null;
    const userComment = (form.get("userComment") as string | null) ?? null;
    const cityId = (form.get("cityId") as string | null) ?? null;

    if (!(image instanceof Blob)) {
      return NextResponse.json(
        { error: "缺少圖片，錯誤回報需附上圖片。" },
        { status: 400 },
      );
    }
    if (!image.type || !image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "檔案不是合法的圖片。" },
        { status: 400 },
      );
    }

    let recognitionId: number | null = null;
    if (recognitionIdRaw != null && recognitionIdRaw !== "") {
      const n = Number(recognitionIdRaw);
      if (Number.isFinite(n) && Number.isInteger(n)) {
        recognitionId = n;
      }
    }

    const originalName =
      image instanceof File && typeof image.name === "string"
        ? image.name
        : undefined;
    const uploaded = await uploadErrorReportImage(image, originalName);

    const reportId = await insertErrorReport({
      recognitionId,
      blobUrl: uploaded.url,
      blobPathname: uploaded.pathname,
      userComment,
      reportedItemId,
      cityId,
      source: "manual",
    });

    const body: ReportErrorApiResponse = { reportId };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/report-error] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
