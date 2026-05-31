"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { maybePlayEgg } from "@/lib/easter-egg";
import {
  clearAll,
  getApiKey,
  getCityId,
  getKeyMode,
  getOrgCode,
  getReports,
  setApiKey,
  setCityId as saveCityId,
  setKeyMode as saveKeyMode,
  setOrgCode as saveOrgCode,
} from "@/lib/storage";
import type {
  OrgValidateRequest,
  OrgValidateResponse,
} from "@/lib/api-contracts";
import type { CityId, KeyMode, ReportEntry } from "@/lib/types";

export default function SettingsPage() {
  const [cityId, setCityId] = useState<CityId>("taipei");
  const [apiKey, setKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [savedFlash, setSavedFlash] = useState<"none" | "key" | "wipe">("none");

  // v2.1
  const [keyMode, setKeyModeState] = useState<KeyMode>("own");
  const [orgInput, setOrgInput] = useState("");
  const [savedOrgCode, setSavedOrgCode] = useState("");
  const [orgValidating, setOrgValidating] = useState(false);
  const [orgMsg, setOrgMsg] = useState<
    | { kind: "ok"; name: string }
    | { kind: "err"; message: string }
    | null
  >(null);

  useEffect(() => {
    setCityId(getCityId());
    setSavedKey(getApiKey());
    setReports(getReports());
    setKeyModeState(getKeyMode());
    setSavedOrgCode(getOrgCode());
  }, []);

  function handleCityChange(id: CityId) {
    setCityId(id);
    saveCityId(id);
  }

  function handleSaveKey() {
    setApiKey(apiKey.trim());
    setSavedKey(apiKey.trim());
    setKey("");
    setSavedFlash("key");
    setTimeout(() => setSavedFlash("none"), 1500);
  }

  function handleClearKey() {
    setApiKey("");
    setSavedKey("");
  }

  function handleWipe() {
    if (
      !confirm(
        "確認要清除瀏覽器內所有資料嗎？（API Key、組織代號、模式、縣市、回報紀錄）"
      )
    ) {
      return;
    }
    clearAll();
    setCityId("taipei");
    setSavedKey("");
    setReports([]);
    setKeyModeState("own");
    setSavedOrgCode("");
    setOrgInput("");
    setOrgMsg(null);
    setSavedFlash("wipe");
    setTimeout(() => setSavedFlash("none"), 1500);
  }

  function handleModeChange(mode: KeyMode) {
    setKeyModeState(mode);
    saveKeyMode(mode);
  }

  async function handleValidateOrg() {
    const code = orgInput.trim();
    if (!code) return;
    setOrgValidating(true);
    setOrgMsg(null);
    try {
      const body: OrgValidateRequest = { code };
      const res = await fetch("/api/orgs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as OrgValidateResponse;
      if (res.ok && data.ok) {
        saveOrgCode(code);
        setSavedOrgCode(code);
        setOrgInput("");
        setOrgMsg({ kind: "ok", name: data.name ?? code });
      } else {
        setOrgMsg({
          kind: "err",
          message: "代號無效或已停用，請確認後重試。",
        });
      }
    } catch {
      setOrgMsg({ kind: "err", message: "驗證失敗，請檢查網路後重試。" });
    } finally {
      setOrgValidating(false);
    }
  }

  function handleClearOrg() {
    saveOrgCode("");
    setSavedOrgCode("");
    setOrgInput("");
    setOrgMsg(null);
  }

  const orgFieldsDisabled = keyMode === "own";

  return (
    <>
      <Header cityId={cityId} onCityChange={handleCityChange} />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">設定</h1>
            <p className="text-sm text-neutral-500">
              API Key 與組織代號只存在這個瀏覽器，不上傳伺服器。
            </p>
          </header>

          {/* 辨識來源模式 */}
          <section className="space-y-3 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 sm:p-6">
            <h2 className="font-serif text-lg font-semibold">辨識來源模式</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              選擇要使用你自己的 Gemini API Key，或是組織提供的代號（適合學校、社團共用）。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { id: "own" as KeyMode, label: "用我自己的 API Key" },
                  { id: "org" as KeyMode, label: "用組織提供的代號" },
                ]
              ).map((m) => {
                const active = keyMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleModeChange(m.id)}
                    className={`py-4 rounded-2xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-white text-black"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 組織代號 */}
          <section className="space-y-3 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-serif text-lg font-semibold">組織代號</h2>
              {savedOrgCode && (
                <span className="text-xs text-emerald-400">
                  ✓ 已儲存：{savedOrgCode}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {orgFieldsDisabled
                ? "目前模式為「自帶 API Key」，組織代號不會被使用。如要切換，請選上方的「用組織提供的代號」。"
                : "輸入組織提供的代號，按下「驗證並儲存」後即可開始辨識。"}
            </p>
            <input
              type="text"
              value={orgInput}
              onChange={(e) => setOrgInput(e.target.value)}
              disabled={orgFieldsDisabled}
              placeholder={
                savedOrgCode
                  ? `目前：${savedOrgCode}（輸入新代號可覆蓋）`
                  : "例如：ABCD1234"
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-neutral-600 disabled:opacity-40"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleValidateOrg}
                disabled={orgFieldsDisabled || !orgInput.trim() || orgValidating}
                className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30"
              >
                {orgValidating ? "驗證中…" : "驗證並儲存"}
              </button>
              {savedOrgCode && (
                <button
                  onClick={handleClearOrg}
                  disabled={orgFieldsDisabled}
                  className="px-5 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-40"
                >
                  清除
                </button>
              )}
            </div>
            {orgMsg?.kind === "ok" && (
              <p className="text-xs text-emerald-400">
                ✓ 已連線到組織：{orgMsg.name}
              </p>
            )}
            {orgMsg?.kind === "err" && (
              <p className="text-xs text-rose-400">{orgMsg.message}</p>
            )}
          </section>

          {/* API Key */}
          <section className="space-y-3 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-serif text-lg font-semibold">Gemini API Key</h2>
              {savedKey && (
                <span className="text-xs text-emerald-400">
                  ✓ 已儲存（{savedKey.slice(0, 6)}…{savedKey.slice(-4)}）
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              本網站不在伺服器保存任何金鑰；每次辨識會把 Key 透過後端代發給 Google，但不會記錄。請使用個人或測試 Key，避免使用組織付費 Key。
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline ml-1"
              >
                取得 API Key →
              </a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                const v = e.target.value;
                setKey(v);
                maybePlayEgg(v);
              }}
              placeholder={savedKey ? "輸入新 Key 以覆蓋" : "貼上你的 Key"}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-neutral-600"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="flex-1 py-3 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-30"
              >
                儲存
              </button>
              {savedKey && (
                <button
                  onClick={handleClearKey}
                  className="px-5 py-3 rounded-full border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-900"
                >
                  清除
                </button>
              )}
            </div>
            {savedFlash === "key" && (
              <p className="text-xs text-emerald-400">✓ 已儲存。</p>
            )}
          </section>

          {/* 縣市 */}
          <section className="space-y-3 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 sm:p-6">
            <h2 className="font-serif text-lg font-semibold">預設縣市</h2>
            <p className="text-xs text-neutral-500">
              辨識結果會使用此縣市的處理規則；可在頁面右上即時切換。
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "taipei", label: "臺北市" },
                  { id: "kaohsiung", label: "高雄市" },
                ] as const
              ).map((c) => {
                const active = cityId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleCityChange(c.id)}
                    className={`py-3 rounded-2xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-white text-black"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 回報紀錄 */}
          <section className="space-y-3 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 sm:p-6">
            <h2 className="font-serif text-lg font-semibold">本機回報紀錄</h2>
            <p className="text-xs text-neutral-500">
              你回報過「分錯了」的紀錄；同時也會送往伺服器供改善資料庫。
            </p>
            {reports.length === 0 ? (
              <p className="text-xs text-neutral-600 py-4">尚無回報紀錄。</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {reports.map((r, i) => (
                  <li
                    key={i}
                    className="text-xs bg-neutral-900 rounded-xl px-3 py-2 text-neutral-400"
                  >
                    <div>
                      {new Date(r.ts).toLocaleString("zh-TW", { hour12: false })}
                    </div>
                    <div>
                      原判：<span className="text-neutral-200">{r.itemId}</span>
                      {r.reportedItemId && (
                        <>
                          {" "}
                          → 應為：
                          <span className="text-neutral-200">{r.reportedItemId}</span>
                        </>
                      )}
                    </div>
                    {r.reason && (
                      <div className="text-neutral-500 mt-0.5">{r.reason}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 危險區 */}
          <section className="space-y-3 bg-rose-950/20 border border-rose-900/40 rounded-3xl p-5 sm:p-6">
            <h2 className="font-serif text-lg font-semibold text-rose-300">
              清除本機資料
            </h2>
            <p className="text-xs text-rose-200/60">
              會移除 API Key、組織代號、模式、縣市偏好與回報紀錄。此操作不可復原。
            </p>
            <button
              onClick={handleWipe}
              className="w-full py-3 rounded-full border border-rose-800/60 text-sm text-rose-300 hover:bg-rose-950/40"
            >
              一鍵清除
            </button>
            {savedFlash === "wipe" && (
              <p className="text-xs text-emerald-400">✓ 已清除。</p>
            )}
          </section>

          <Footer />
        </div>
      </main>
    </>
  );
}
