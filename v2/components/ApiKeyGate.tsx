"use client";

import { useState } from "react";
import { maybePlayEgg } from "@/lib/easter-egg";
import { ArrowRightIcon, WarningIcon } from "@/components/icons";
import type {
  OrgValidateRequest,
  OrgValidateResponse,
} from "@/lib/api-contracts";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaveOwnKey: (apiKey: string) => void;
  onSaveOrg: (orgCode: string, orgName: string) => void;
}

type Step = "choose" | "org" | "own";

export default function ApiKeyGate({
  open,
  onClose,
  onSaveOwnKey,
  onSaveOrg,
}: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [orgInput, setOrgInput] = useState("");
  const [orgValidating, setOrgValidating] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");

  if (!open) return null;

  function reset() {
    setStep("choose");
    setOrgInput("");
    setOrgValidating(false);
    setOrgError(null);
    setKeyInput("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submitOrg() {
    const code = orgInput.trim();
    if (!code) return;
    setOrgValidating(true);
    setOrgError(null);
    try {
      const body: OrgValidateRequest = { code };
      const res = await fetch("/api/orgs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as OrgValidateResponse;
      if (res.ok && data.ok) {
        onSaveOrg(code, data.name ?? code);
        reset();
      } else {
        setOrgError("代號無效或已停用，請向老師確認後重試。");
      }
    } catch {
      setOrgError("驗證失敗，請檢查網路後重試。");
    } finally {
      setOrgValidating(false);
    }
  }

  function submitOwn() {
    const key = keyInput.trim();
    if (!key) return;
    onSaveOwnKey(key);
    reset();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
        {step === "choose" && (
          <>
            <header>
              <h2 className="font-serif text-xl font-bold">
                要使用組織代號嗎？
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                老師發放的組織代號可以讓全班共用，無須自備 Gemini API Key。
                你也可以選擇使用自己的 API Key（圖片不會永久保存於我們的伺服器）。
              </p>
            </header>

            <div className="space-y-2">
              <button
                onClick={() => setStep("org")}
                className="w-full text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl p-4 transition-colors"
              >
                <div className="font-semibold text-sm">
                  使用組織代號（推薦）
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  請直接輸入{" "}
                  <span className="font-mono text-neutral-200">t202605</span>{" "}
                  即可立即開始辨識。
                </div>
              </button>

              <button
                onClick={() => setStep("own")}
                className="w-full text-left bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 rounded-2xl p-4 transition-colors"
              >
                <div className="font-semibold text-sm">
                  使用自己的 Gemini API Key
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  只會存在這個瀏覽器的 LocalStorage，不會被伺服器記錄。
                </div>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-full border border-neutral-800 text-sm text-neutral-400"
            >
              稍後再說
            </button>
          </>
        )}

        {step === "org" && (
          <>
            <header>
              <h2 className="font-serif text-xl font-bold">輸入組織代號</h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                請直接輸入{" "}
                <span className="font-mono text-neutral-200">t202605</span>{" "}
                即可開始使用。代號僅供本班同學使用，請勿外傳。
              </p>
            </header>

            <div className="space-y-2">
              <label className="text-xs text-neutral-400">組織代號</label>
              <input
                autoFocus
                value={orgInput}
                onChange={(e) => {
                  setOrgInput(e.target.value);
                  setOrgError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !orgValidating) void submitOrg();
                }}
                placeholder="t202605"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-neutral-600"
              />
              {orgError && (
                <p className="text-xs text-rose-400">{orgError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("choose")}
                disabled={orgValidating}
                className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400 disabled:opacity-40"
              >
                返回
              </button>
              <button
                onClick={() => void submitOrg()}
                disabled={!orgInput.trim() || orgValidating}
                className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30"
              >
                {orgValidating ? "驗證中…" : "開始使用"}
              </button>
            </div>
          </>
        )}

        {step === "own" && (
          <>
            <header>
              <h2 className="font-serif text-xl font-bold">
                需要你的 Gemini API Key
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                為了保護隱私，本網站不在伺服器保存任何金鑰。你的 API Key 只會存在這個瀏覽器的 LocalStorage 內。
              </p>
            </header>

            <div className="space-y-2">
              <label className="text-xs text-neutral-400">Gemini API Key</label>
              <input
                type="password"
                autoFocus
                value={keyInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setKeyInput(v);
                  maybePlayEgg(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitOwn();
                }}
                placeholder="貼上你的 API Key"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-neutral-600"
              />
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                前往 Google AI Studio 取得免費 API Key
                <ArrowRightIcon className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-2 text-xs text-amber-400/80 bg-amber-950/30 border border-amber-900/40 rounded-lg p-3 leading-relaxed">
              <WarningIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>請使用個人或測試用 Key，避免使用組織付費 Key。本工具不會將 Key 上傳，但前端可能會在你的瀏覽器留下紀錄。</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("choose")}
                className="flex-1 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400"
              >
                返回
              </button>
              <button
                onClick={submitOwn}
                disabled={!keyInput.trim()}
                className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30"
              >
                儲存並開始
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
