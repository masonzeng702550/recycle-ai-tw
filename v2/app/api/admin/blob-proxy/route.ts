// 私有 Blob 的 server-side proxy。瀏覽器拿不到 token，所以由 server 帶 token 抓回再 stream
// 路徑被 middleware 保護，只有 admin cookie 能用
import { NextResponse, type NextRequest } from "next/server";
import { get } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.searchParams.get("p");
  if (!pathname) {
    return NextResponse.json({ error: "missing p" }, { status: 400 });
  }
  // 防呆：必須是 error-reports/ 開頭，避免 path 逃逸
  if (!pathname.startsWith("error-reports/") || pathname.includes("..")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || !result.stream) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return new Response(result.stream, {
      status: 200,
      headers: {
        "content-type": result.blob.contentType || "image/jpeg",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[/api/admin/blob-proxy] error", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
