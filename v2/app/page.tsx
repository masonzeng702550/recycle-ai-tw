"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ApiKeyGate from "@/components/ApiKeyGate";
import ClarifyDialog from "@/components/ClarifyDialog";
import ResultCard from "@/components/ResultCard";
import { items as ALL_ITEMS, getCityRule, getItem } from "@/lib/catalog";
import { analyzeImages, clarifyAnalyze } from "@/lib/gemini";
import {
  getApiKey,
  setApiKey as saveApiKey,
  getCityId,
  setCityId as saveCityId,
} from "@/lib/storage";
import type {
  AnalyzeResult,
  CityId,
  IdentifiedResult,
  UncertainResult,
  UploadedImage,
} from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "clarifying"; uncertain: UncertainResult }
  | { kind: "result"; result: IdentifiedResult }
  | { kind: "error"; message: string };

export default function HomePage() {
  const [cityId, setCityId] = useState<CityId>("taipei");
  const [apiKey, setApiKeyState] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    setApiKeyState(getApiKey());
    setCityId(getCityId());
  }, []);

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

  async function runAnalyze(keyOverride?: string) {
    const key = keyOverride ?? apiKey;
    if (!key) {
      setGateOpen(true);
      return;
    }
    if (images.length === 0) return;

    setState({ kind: "analyzing" });
    const result = await analyzeImages(
      key,
      images.map((i) => i.file)
    );
    handleResult(result);
  }

  function handleResult(result: AnalyzeResult) {
    if (result.status === "identified") {
      // low confidence 也會直接顯示，但 ResultCard 會用紅字標示
      setState({ kind: "result", result });
    } else if (result.status === "uncertain") {
      setState({ kind: "clarifying", uncertain: result });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }

  async function submitClarify(
    uncertain: UncertainResult,
    qa: { q: string; a: string }[]
  ) {
    setState({ kind: "analyzing" });
    const candidates = (uncertain.candidateItemIds ?? [])
      .map(getItem)
      .filter((it): it is NonNullable<typeof it> => Boolean(it));
    const useCandidates = candidates.length > 0 ? candidates : ALL_ITEMS;
    const result = await clarifyAnalyze(
      apiKey,
      images.map((i) => i.file),
      useCandidates,
      qa
    );
    handleResult(result);
  }

  function reset() {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setState({ kind: "idle" });
  }

  const cityName = getCityRule(cityId).cityName;

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

              <ImageUploader
                images={images}
                onChange={setImages}
                disabled={state.kind === "analyzing"}
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => runAnalyze()}
                  disabled={images.length === 0 || state.kind === "analyzing"}
                  className="flex-1 py-3.5 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all"
                >
                  {state.kind === "analyzing"
                    ? "辨識中…"
                    : `開始辨識（${images.length} 張）`}
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
                你的 API Key 與圖片不會經過我們的伺服器，全程在你的瀏覽器完成。
              </p>
            </section>

            {/* 右欄：結果 / 說明 */}
            <aside className="md:col-span-2">
              <div className="md:sticky md:top-20">
                {state.kind === "idle" && <IdleAside />}

                {state.kind === "analyzing" && <AnalyzingAside />}

                {state.kind === "clarifying" && (
                  <ClarifyDialog
                    result={state.uncertain}
                    onSubmit={(qa) => submitClarify(state.uncertain, qa)}
                    onCancel={reset}
                  />
                )}

                {state.kind === "result" && (
                  <ResultCard
                    result={state.result}
                    cityId={cityId}
                    cityName={cityName}
                    onRetry={reset}
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
              本工具為臺北市數位實驗高中公民行動學期專題（v2.0），分類規則僅供參考，最終以各市環保局公告為準。
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

function IdleAside() {
  return (
    <div className="rounded-3xl bg-neutral-900/50 border border-dashed border-neutral-800 p-6 text-sm text-neutral-500 leading-relaxed space-y-3">
      <p className="font-serif text-base text-neutral-300">怎麼用？</p>
      <ol className="space-y-1.5 text-xs">
        <li>1. 點左邊「+」拍照或選擇 1~3 張圖片</li>
        <li>2. 第一次使用會請你貼上 Gemini API Key</li>
        <li>3. 看到結果會包含當地處理方式、應投入的桶</li>
        <li>4. AI 不確定時會追問幾題以縮小範圍</li>
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
