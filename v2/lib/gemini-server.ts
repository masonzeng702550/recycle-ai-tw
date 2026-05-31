// 伺服器端使用組織 Key 呼叫 Gemini 的版本（與 lib/gemini.ts 客戶端版共用 prompt）

import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { items } from "./catalog";
import { buildBroadPrompt } from "./prompts";
import type { AnalyzeResult, CategoryGroup } from "./types";

const MODEL = "gemini-2.5-flash";

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function isGroup(g: unknown): g is CategoryGroup {
  return (
    typeof g === "string" &&
    [
      "paper",
      "plastic",
      "glass",
      "metal",
      "food",
      "general",
      "hazardous",
      "large",
      "electronics",
      "clothing",
    ].includes(g)
  );
}

function validate(parsed: unknown): AnalyzeResult {
  if (!parsed || typeof parsed !== "object") {
    return { status: "error", message: "AI 回應格式異常。" };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.status === "identified") {
    const itemId = String(obj.itemId ?? "");
    const known = items.find((it) => it.id === itemId);
    if (!known) return { status: "error", message: `未知 itemId：${itemId}` };
    if (!isGroup(obj.group)) {
      return { status: "error", message: "未知 group。" };
    }
    const conf = obj.confidence;

    // 解析複合材質 components（合法的部件才保留；空陣列 → 不附）
    let components:
      | { itemId: string; itemName: string; group: CategoryGroup }[]
      | undefined;
    if (Array.isArray(obj.components)) {
      components = (obj.components as unknown[])
        .map((c): { itemId: string; itemName: string; group: CategoryGroup } | null => {
          if (!c || typeof c !== "object") return null;
          const co = c as Record<string, unknown>;
          const cid = String(co.itemId ?? "");
          const cKnown = items.find((it) => it.id === cid);
          if (!cKnown) return null;
          if (!isGroup(co.group)) return null;
          return {
            itemId: cid,
            itemName: String(co.itemName ?? cKnown.nameZh),
            group: co.group,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
      if (components.length === 0) components = undefined;
    }

    return {
      status: "identified",
      itemId,
      itemName: String(obj.itemName ?? known.nameZh),
      group: obj.group,
      confidence:
        conf === "high" || conf === "medium" || conf === "low"
          ? conf
          : "medium",
      explanation: String(obj.explanation ?? ""),
      ...(components ? { components } : {}),
    };
  }
  if (obj.status === "uncertain") {
    return {
      status: "uncertain",
      partialName: obj.partialName ? String(obj.partialName) : undefined,
      candidateItemIds: Array.isArray(obj.candidateItemIds)
        ? (obj.candidateItemIds as unknown[]).map(String)
        : undefined,
      questions: Array.isArray(obj.questions)
        ? (obj.questions as unknown[])
            .map((q, i) => {
              const qo = q as Record<string, unknown>;
              return {
                id: String(qo.id ?? `q${i + 1}`),
                q: String(qo.q ?? ""),
                options: Array.isArray(qo.options)
                  ? (qo.options as unknown[]).map(String)
                  : [],
              };
            })
            .filter((x) => x.q && x.options.length > 0)
        : [],
      requestBetterImage: Boolean(obj.requestBetterImage),
    };
  }
  return { status: "error", message: "AI 回應未提供合法 status。" };
}

async function blobToInlinePart(file: Blob) {
  const buf = Buffer.from(await file.arrayBuffer());
  return {
    inlineData: {
      data: buf.toString("base64"),
      mimeType: file.type || "image/jpeg",
    },
  };
}

export async function analyzeWithKey(
  apiKey: string,
  files: Blob[],
): Promise<AnalyzeResult> {
  if (files.length === 0) {
    return { status: "error", message: "沒有圖片。" };
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const parts = await Promise.all(files.map(blobToInlinePart));
    const prompt = buildBroadPrompt(items);
    const result = await model.generateContent([prompt, ...parts]);
    const text = result.response.text();
    return validate(JSON.parse(stripJsonFences(text)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    if (/api[_ ]?key|401|403/i.test(msg)) {
      return {
        status: "error",
        message: "組織 API Key 無效或無權限。",
        code: "INVALID_KEY",
      };
    }
    if (/429|quota|rate/i.test(msg)) {
      return {
        status: "error",
        message: "Gemini 已達上限或被限速。",
        code: "RATE_LIMIT",
      };
    }
    return { status: "error", message: `辨識失敗：${msg}` };
  }
}
