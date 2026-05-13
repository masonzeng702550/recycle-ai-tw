"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ApiKeyGate from "@/components/ApiKeyGate";
import ResultCard from "@/components/ResultCard";
import TurnstileWidget from "@/components/TurnstileWidget";
import { getCityRule } from "@/lib/catalog";
import { maybeResizeImage } from "@/lib/image-resize";
import {
  getApiKey,
  setApiKey as saveApiKey,
  getCityId,
  setCityId as saveCityId,
  getKeyMode,
  getOrgCode,
} from "@/lib/storage";
import type {
  AnalyzeApiResponse,
  OrgValidateRequest,
  OrgValidateResponse,
} from "@/lib/api-contracts";
import type {
  CityId,
  IdentifiedResult,
  KeyMode,
  UploadedImage,
} from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; result: IdentifiedResult; recognitionId: number | null }
  | { kind: "uncertain"; message: string }
  | { kind: "error"; message: string };

export default function HomePage() {
  const [cityId, setCityId] = useState<CityId>("taipei");
  const [apiKey, setApiKeyState] = useState("");
  const [keyMode, setKeyModeState] = useState<KeyMode>("own");
  const [orgCode, setOrgCodeState] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [state, setState] = useState<State>({ kind: "idle" });
  const turnstileSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiKeyState(getApiKey());
    setCityId(getCityId());
    const mode = getKeyMode();
    const code = getOrgCode();
    setKeyModeState(mode);
    setOrgCodeState(code);

    if (mode === "org" && code) {
      void validateOrg(code);
    }
  }, []);

  async function validateOrg(code: string) {
    setOrgError(null);
    setOrgName(null);
    try {
      const body: OrgValidateRequest = { code };
      const res = await fetch("/api/orgs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as OrgValidateResponse;
      if (res.ok && data.ok) {
        setOrgName(data.name ?? code);
      } else {
        setOrgError("組織代號無效或已停用，請至設定重新輸入。");
      }
    } catch {
      setOrgError("無法驗證組織代號（網路錯誤）。");
    }
  }

  function handleCityChange(id: CityId) {
    setCityId(id);
    saveCityId(id);
  }

  function handleSaveKey(key: string) {
    saveApiKey(key);
    setApiKeyState(key);
    setGateOpen(false);
    void runAnalyze(key);
  }

  function resetTurnstile() {
    setTurnstileToken(null);
    setTurnstileResetKey((k) => k + 1);
  }

  async function runAnalyze(keyOverride?: string) {
    if (images.length === 0) return;

    // 組織模式但代號驗證失敗：擋下
    if (keyMode === "org") {
      if (!orgCode) {
        setState({ kind: "error", message: "尚未設定組織代號，請至設定頁。" });
        return;
      }
      if (orgError) {
        setState({ kind: "error", message: orgError });
        return;
      }
    }

    // 自帶 Key 模式：缺 Key 時開啟 Gate
    const key = keyOverride ?? apiKey;
    if (keyMode === "own" && !key) {
      setGateOpen(true);
      return;
    }

    if (!turnstileToken) {
      // 滾動到 Turnstile 區塊
      turnstileSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setState({ kind: "analyzing" });
    try {
      // 縮到 2560px 邊長以內，避免被 Vercel 4.5 MB body 上限擋住
      const sendable = await maybeResizeImage(images[0].file);
      const fd = new FormData();
      fd.append("image", sendable);
      fd.append("cityId", cityId);
      fd.append("turnstileToken", turnstileToken);
      fd.append("keyMode", keyMode);
      if (keyMode === "own") {
        fd.append("apiKey", key);
      } else {
        fd.append("orgCode", orgCode);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: fd,
      });

      // 不論成敗，Turnstile token 一次性
      resetTurnstile();

      if (!res.ok) {
        let msg = `辨識失敗（HTTP ${res.status}）`;
        try {
          const errData = await res.json();
          if (errData?.message) msg = String(errData.message);
          else if (errData?.error) msg = String(errData.error);
        } catch {}
        setState({ kind: "error", message: msg });
        return;
      }

      const data = (await res.json()) as AnalyzeApiResponse;
      const { result, recognitionId } = data;

      if (result.status === "identified") {
        setState({ kind: "result", result, recognitionId });
      } else if (result.status === "uncertain") {
        setState({
          kind: "uncertain",
          message: "AI 還無法判斷這張圖，請換個角度或更清楚的照片再試一次。",
        });
      } else {
        setState({ kind: "error", message: result.message });
      }
    } catch (err) {
      resetTurnstile();
      const msg = err instanceof Error ? err.message : "未知錯誤";
      setState({ kind: "error", message: `辨識失敗：${msg}` });
    }
  }

  function reset() {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setState({ kind: "idle" });
    resetTurnstile();
  }

  const cityName = getCityRule(cityId).cityName;
  const currentImageFile = images[0]?.file ?? null;

  const analyzeDisabled =
    images.length === 0 ||
    state.kind === "analyzing" ||
    !turnstileToken ||
    (keyMode === "org" && (!!orgError || !orgCode));

  return (
    <>
      <Header cityId={cityId} onCityChange={handleCityChange} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
            {/* 左欄：上傳區 */}
            <section className="md:col-span-3 space-y-4">
              <header className="space-y-1">
                <h1 className="font-serif text-3xl sm:text-4xl font-bold">
                  拍下廢棄物，
                  <wbr />
                  立刻知道怎麼丟
                </h1>
                <p className="text-sm text-neutral-500">
                  目前依據 <strong className="text-neutral-300">{cityName}</strong>{" "}
                  規則。可在右上方切換縣市。
                </p>
              </header>

              {/* 來源模式 pill */}
              <SourcePill
                keyMode={keyMode}
                orgName={orgName}
                orgCode={orgCode}
                orgError={orgError}
              />

              <ImageUploader
                images={images}
                onChange={setImages}
                disabled={state.kind === "analyzing"}
              />

              {/* Turnstile（在分析按鈕上方） */}
              <div ref={turnstileSectionRef} className="flex justify-center py-2">
                <TurnstileWidget
                  resetKey={turnstileResetKey}
                  onToken={(t) => setTurnstileToken(t)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => runAnalyze()}
                  disabled={analyzeDisabled}
                  className="flex-1 py-3.5 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all"
                >
                  {state.kind === "analyzing"
                    ? "辨識中…"
                    : !turnstileToken && images.length > 0
                      ? "請先完成人機驗證"
                      : "開始辨識"}
                </button>
                {images.length > 0 && (
                  <button
                    onClick={reset}
                    disabled={state.kind === "analyzing"}
                    className="sm:w-32 py-3.5 rounded-full border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-900"
                  >
                    重新選擇
                  </button>
                )}
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                圖片只在這次辨識時送往伺服器，不會永久保留；自帶 API Key 時你的 Key 不會被記錄。錯誤回報的照片會永久保留供改善資料庫。
              </p>
            </section>

            {/* 右欄：結果 / 說明 */}
            <aside className="md:col-span-2">
              <div className="md:sticky md:top-20">
                {state.kind === "idle" && <IdleAside />}

                {state.kind === "analyzing" && <AnalyzingAside />}

                {state.kind === "uncertain" && (
                  <InfoAside
                    title="再試一張清楚的照片"
                    message={state.message}
                    onRetry={reset}
                  />
                )}

                {state.kind === "result" && (
                  <ResultCard
                    result={state.result}
                    cityId={cityId}
                    cityName={cityName}
                    onRetry={reset}
                    recognitionId={state.recognitionId}
                    imageFile={currentImageFile}
                  />
                )}

                {state.kind === "error" && (
                  <ErrorAside message={state.message} onRetry={reset} />
                )}
              </div>
            </aside>
          </div>

          <footer className="mt-12 pt-6 border-t border-neutral-900 text-center text-xs text-neutral-600 space-y-1">
            <p>
              本工具為臺北市數位實驗高中公民行動學期專題（v2.1），分類規則僅供參考，最終以各市環保局公告為準。
            </p>
            <p>
              <a
                href="https://recycle.rethinktw.org/"
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                資料骨架參考：回收大百科
              </a>
            </p>
          </footer>
        </div>
      </main>

      <ApiKeyGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onSave={handleSaveKey}
      />
    </>
  );
}

function SourcePill({
  keyMode,
  orgName,
  orgCode,
  orgError,
}: {
  keyMode: KeyMode;
  orgName: string | null;
  orgCode: string;
  orgError: string | null;
}) {
  if (keyMode === "own") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        目前使用：你的 API Key
      </div>
    );
  }
  if (orgError) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {orgError}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
      目前使用：組織 {orgName ?? "(驗證中…)"}（代號 {orgCode || "—"}）
    </div>
  );
}

function IdleAside() {
  return (
    <div className="rounded-3xl bg-neutral-900/50 border border-dashed border-neutral-800 p-6 text-sm text-neutral-500 leading-relaxed space-y-3">
      <p className="font-serif text-base text-neutral-300">怎麼用？</p>
      <ol className="space-y-1.5 text-xs">
        <li>1. 點左邊「+」拍照或選擇 1 張圖片</li>
        <li>2. 完成人機驗證（Cloudflare Turnstile）</li>
        <li>3. 看到結果會包含當地處理方式、應投入的桶</li>
        <li>4. AI 不確定時會請你換個角度再拍一張</li>
      </ol>
      <p className="text-[11px] text-neutral-600 pt-2">
        如要直接查資料庫，請至上方「資料庫」分頁。
      </p>
    </div>
  );
}

function AnalyzingAside() {
  return (
    <div className="flex flex-col items-center gap-5 py-16 rounded-3xl bg-neutral-900/50 border border-neutral-800">
      <div className="w-12 h-12 rounded-full border-2 border-neutral-700 border-t-neutral-300 animate-spin" />
      <div className="text-center space-y-1">
        <p className="font-serif text-lg text-neutral-200">AI 正在分析圖片</p>
        <p className="text-xs text-neutral-600">通常需要 5–10 秒</p>
      </div>
    </div>
  );
}

function InfoAside({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl bg-neutral-900 overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <header className="flex items-center gap-3">
          <span className="text-3xl">?</span>
          <div>
            <h2 className="font-serif text-lg font-bold">{title}</h2>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              {message}
            </p>
          </div>
        </header>
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-full bg-white text-black text-sm font-semibold"
        >
          重新拍一張
        </button>
      </div>
    </div>
  );
}

function ErrorAside({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl bg-neutral-900 overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <header className="flex items-center gap-3">
          <span className="text-3xl">!</span>
          <div>
            <h2 className="font-serif text-lg font-bold">發生錯誤</h2>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              {message}
            </p>
          </div>
        </header>
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-full bg-white text-black text-sm font-semibold"
        >
          重試
        </button>
      </div>
    </div>
  );
}
