"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageUploader from "@/components/ImageUploader";
import ApiKeyGate from "@/components/ApiKeyGate";
import FirstSuccessPromo from "@/components/FirstSuccessPromo";
import ResultCard from "@/components/ResultCard";
import SocialLinks from "@/components/SocialLinks";
import SystemBusyModal from "@/components/SystemBusyModal";
import TurnstileWidget from "@/components/TurnstileWidget";
import { getCityRule } from "@/lib/catalog";
import { maybeResizeImage } from "@/lib/image-resize";
import {
  getApiKey,
  setApiKey as saveApiKey,
  getCityId,
  setCityId as saveCityId,
  getKeyMode,
  setKeyMode as saveKeyMode,
  getOrgCode,
  setOrgCode as saveOrgCode,
  getPromoShown,
  setPromoShown,
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
  const [promoOpen, setPromoOpen] = useState(false);
  const [systemBusyOpen, setSystemBusyOpen] = useState(false);
  const promoEverShown = useRef(false);
  // 自動辨識：同一組圖片只觸發一次，使用者改圖 / reset 後才允許再 fire
  const lastAutoFireKey = useRef<string>("");
  const turnstileSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiKeyState(getApiKey());
    setCityId(getCityId());
    const mode = getKeyMode();
    const code = getOrgCode();
    setKeyModeState(mode);
    setOrgCodeState(code);

    // 已經顯示過 promo 的裝置：直接記號，避免再次彈出
    if (getPromoShown()) promoEverShown.current = true;

    if (mode === "org" && code) {
      void validateOrg(code);
    }
  }, []);

  // 第一次出現 identified 結果時，跳「追蹤 IG / 回饋表單」彈窗
  useEffect(() => {
    if (state.kind !== "result") return;
    if (promoEverShown.current) return;
    promoEverShown.current = true;
    setPromoShown(true);
    // 結果剛渲染先讓使用者看到，再延遲跳廣告
    const t = setTimeout(() => setPromoOpen(true), 900);
    return () => clearTimeout(t);
  }, [state.kind]);

  // 上傳完成 + 人機驗證完成 → 自動開始辨識，不必再按按鈕。
  // 同一組 image id 只 fire 一次；改圖或 reset 才允許下一次。
  // 缺驗證資訊時也照 fire — runAnalyze 內部會自動把 ApiKeyGate 打開，
  // gate 儲存完成後它自己會再 trigger 一次 runAnalyze（帶 override）。
  useEffect(() => {
    if (state.kind !== "idle") return;
    if (images.length === 0) return;
    if (!turnstileToken) return; // 等 Turnstile 完成，token 變化會 re-fire
    if (keyMode === "org" && orgError) return; // 組織代號錯誤就讓使用者去處理

    const imageKey = images.map((i) => i.id).join(",");
    if (lastAutoFireKey.current === imageKey) return;
    lastAutoFireKey.current = imageKey;
    void runAnalyze();
    // runAnalyze 依賴會跟著一起變，但這個 effect 只關心觸發時機，所以
    // 不把它放進 deps，避免無限 re-fire
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, images, turnstileToken, keyMode, apiKey, orgCode, orgError]);

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

  function handleSaveOwnKey(key: string) {
    saveApiKey(key);
    setApiKeyState(key);
    saveKeyMode("own");
    setKeyModeState("own");
    setOrgError(null);
    setGateOpen(false);
    void runAnalyze({ mode: "own", key });
  }

  function handleSaveOrg(code: string, name: string) {
    saveOrgCode(code);
    setOrgCodeState(code);
    saveKeyMode("org");
    setKeyModeState("org");
    setOrgName(name);
    setOrgError(null);
    setGateOpen(false);
    void runAnalyze({ mode: "org", orgCode: code });
  }

  function resetTurnstile() {
    setTurnstileToken(null);
    setTurnstileResetKey((k) => k + 1);
  }

  async function runAnalyze(
    override?:
      | { mode: "own"; key: string }
      | { mode: "org"; orgCode: string }
  ) {
    if (images.length === 0) return;

    const effectiveMode: KeyMode = override?.mode ?? keyMode;
    const effectiveKey =
      override?.mode === "own" ? override.key : apiKey;
    const effectiveOrgCode =
      override?.mode === "org" ? override.orgCode : orgCode;

    // 沒有任何驗證資訊 → 開啟 Gate 讓使用者選擇
    if (
      (effectiveMode === "own" && !effectiveKey) ||
      (effectiveMode === "org" && !effectiveOrgCode)
    ) {
      setGateOpen(true);
      return;
    }

    // 組織模式但代號驗證失敗：擋下
    if (effectiveMode === "org" && !override && orgError) {
      setState({ kind: "error", message: orgError });
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
      fd.append("keyMode", effectiveMode);
      if (effectiveMode === "own") {
        fd.append("apiKey", effectiveKey);
      } else {
        fd.append("orgCode", effectiveOrgCode);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: fd,
      });

      // 不論成敗，Turnstile token 一次性
      resetTurnstile();

      if (!res.ok) {
        let msg = `辨識失敗（HTTP ${res.status}）`;
        let code: string | null = null;
        try {
          const errData = await res.json();
          if (errData?.error) code = String(errData.error);
          if (errData?.message) msg = String(errData.message);
          else if (errData?.error) msg = String(errData.error);
        } catch {}
        // 速率限制 / quota：不是辨識錯誤，跳「系統錯誤」彈窗，自動 reload
        if (code === "RATE_LIMIT" || res.status === 503) {
          setState({ kind: "idle" });
          setSystemBusyOpen(true);
          return;
        }
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
    lastAutoFireKey.current = "";
  }

  const cityName = getCityRule(cityId).cityName;
  const currentImageFile = images[0]?.file ?? null;

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

              {/* 社群 / 回饋按鈕 */}
              <SocialLinks />

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

              {/* 上傳完成後自動辨識；不再需要按鈕。
                  狀態指示 + 重新選擇按鈕並排，RWD 在窄螢幕會堆疊。 */}
              {images.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <AutoAnalyzeStatus
                    state={state}
                    hasTurnstile={!!turnstileToken}
                    keyMode={keyMode}
                    orgError={orgError}
                    orgCode={orgCode}
                  />
                  <button
                    onClick={reset}
                    disabled={state.kind === "analyzing"}
                    className="sm:w-32 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-40 shrink-0"
                  >
                    重新選擇
                  </button>
                </div>
              )}

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

          <Footer />
        </div>
      </main>

      <ApiKeyGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onSaveOwnKey={handleSaveOwnKey}
        onSaveOrg={handleSaveOrg}
      />

      <FirstSuccessPromo
        open={promoOpen}
        onClose={() => setPromoOpen(false)}
      />

      <SystemBusyModal open={systemBusyOpen} />
    </>
  );
}

function AutoAnalyzeStatus({
  state,
  hasTurnstile,
  keyMode,
  orgError,
  orgCode,
}: {
  state: State;
  hasTurnstile: boolean;
  keyMode: KeyMode;
  orgError: string | null;
  orgCode: string;
}) {
  // 計算當下要顯示的訊息
  let label: string;
  let tone: "neutral" | "busy" | "warn";
  if (state.kind === "analyzing") {
    label = "辨識中…";
    tone = "busy";
  } else if (keyMode === "org" && (orgError || !orgCode)) {
    label = orgError ?? "請至設定輸入組織代號";
    tone = "warn";
  } else if (!hasTurnstile) {
    label = "請完成下方人機驗證，驗證完成會自動辨識";
    tone = "warn";
  } else {
    // 通常一瞬間就跳到 analyzing；保留 fallback 避免空白
    label = "準備辨識…";
    tone = "busy";
  }

  const toneCls =
    tone === "busy"
      ? "bg-neutral-900 border-neutral-800 text-neutral-200"
      : tone === "warn"
        ? "bg-amber-950/30 border-amber-900/40 text-amber-200"
        : "bg-neutral-900 border-neutral-800 text-neutral-400";

  return (
    <div
      className={`flex-1 inline-flex items-center gap-2 px-4 py-3 rounded-full border text-sm ${toneCls}`}
      aria-live="polite"
    >
      {tone === "busy" ? (
        <span className="w-3 h-3 rounded-full border-2 border-neutral-600 border-t-neutral-200 animate-spin shrink-0" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
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
        <li>2. 完成人機驗證（Cloudflare Turnstile）後自動開始辨識</li>
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
