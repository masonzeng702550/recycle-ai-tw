"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { items } from "./catalog";
import { buildBroadPrompt, buildClarifyPrompt } from "./prompts";
import type {
  AnalyzeResult,
  CategoryGroup,
  Item,
} from "./types";

const MODEL = "gemini-2.5-flash";

async function fileToInlinePart(file: File) {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  return {
    inlineData: {
      data: base64,
      mimeType: file.type || "image/jpeg",
    },
  };
}

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function validateGroup(g: unknown): g is CategoryGroup {
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

function validateResult(parsed: unknown): AnalyzeResult {
  if (!parsed || typeof parsed !== "object") {
    return { status: "error", message: "AI 回應格式異常。" };
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.status === "identified") {
    const itemId = String(obj.itemId ?? "");
    const known = items.find((it) => it.id === itemId);
    if (!known) {
      return {
        status: "error",
        message: `AI 回傳了未知的 itemId：${itemId}`,
      };
    }
    if (!validateGroup(obj.group)) {
      return { status: "error", message: "AI 回傳了未知的 group。" };
    }
    const conf = obj.confidence;
    const confidence =
      conf === "high" || conf === "medium" || conf === "low" ? conf : "medium";

    return {
      status: "identified",
      itemId,
      itemName: String(obj.itemName ?? known.nameZh),
      group: obj.group,
      confidence,
      explanation: String(obj.explanation ?? ""),
    };
  }

  if (obj.status === "uncertain") {
    const questions = Array.isArray(obj.questions)
      ? (obj.questions as unknown[])
          .map((q, i) => {
            const qobj = q as Record<string, unknown>;
            return {
              id: String(qobj.id ?? `q${i + 1}`),
              q: String(qobj.q ?? ""),
              options: Array.isArray(qobj.options)
                ? (qobj.options as unknown[]).map(String)
                : [],
            };
          })
          .filter((q) => q.q && q.options.length > 0)
      : [];

    return {
      status: "uncertain",
      partialName: obj.partialName ? String(obj.partialName) : undefined,
      candidateItemIds: Array.isArray(obj.candidateItemIds)
        ? (obj.candidateItemIds as unknown[]).map(String)
        : undefined,
      questions,
      requestBetterImage: Boolean(obj.requestBetterImage),
    };
  }

  return { status: "error", message: "AI 回應未提供合法的 status。" };
}

export async function analyzeImages(
  apiKey: string,
  files: File[]
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return { status: "error", message: "請先在「設定」輸入 Gemini API Key。" };
  }
  if (files.length === 0) {
    return { status: "error", message: "請至少上傳一張圖片。" };
  }
  if (files.length > 3) {
    return { status: "error", message: "最多 3 張圖片。" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const parts = await Promise.all(files.map(fileToInlinePart));
    const prompt = buildBroadPrompt(items);

    const result = await model.generateContent([prompt, ...parts]);
    const text = result.response.text();
    const json = JSON.parse(stripJsonFences(text));
    return validateResult(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    if (/api[_ ]?key|401|403/i.test(msg)) {
      return {
        status: "error",
        message: "API Key 無效或無權限，請至設定重新輸入。",
      };
    }
    if (/429|quota|rate/i.test(msg)) {
      return {
        status: "error",
        message: "Gemini 用量已達上限或被限速，請稍後再試。",
      };
    }
    return { status: "error", message: `辨識失敗：${msg}` };
  }
}

export async function clarifyAnalyze(
  apiKey: string,
  files: File[],
  candidateItems: Item[],
  qa: { q: string; a: string }[]
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return { status: "error", message: "請先輸入 API Key。" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const parts = await Promise.all(files.map(fileToInlinePart));
    const prompt = buildClarifyPrompt(candidateItems, qa);
    const result = await model.generateContent([prompt, ...parts]);
    const text = result.response.text();
    const json = JSON.parse(stripJsonFences(text));
    return validateResult(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    return { status: "error", message: `追問辨識失敗：${msg}` };
  }
}
