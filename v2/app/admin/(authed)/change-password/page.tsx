"use client";

import { useState } from "react";
import type { AdminChangePasswordRequest } from "@/lib/api-contracts";

const MIN_LEN = 12;

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < MIN_LEN) {
      setError(`新密碼至少 ${MIN_LEN} 個字元`);
      return;
    }
    if (next !== confirm) {
      setError("兩次輸入的新密碼不一致");
      return;
    }
    if (next === current) {
      setError("新密碼不可與目前密碼相同");
      return;
    }

    setBusy(true);
    try {
      const body: AdminChangePasswordRequest = { current, next };
      const resp = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data?.error ?? `更新失敗 (${resp.status})`);
        return;
      }
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("網路錯誤");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl">修改密碼</h1>
        <p className="text-sm text-neutral-500 mt-1">
          建議使用至少 {MIN_LEN} 字元、混合英數的密碼。
        </p>
      </div>

      <form
        onSubmit={submit}
        className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">目前密碼</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">新密碼</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_LEN}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
          />
          <span className="text-xs text-neutral-600">
            至少 {MIN_LEN} 個字元
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-400">再次輸入新密碼</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_LEN}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
          />
        </label>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded-xl px-3 py-2">
            ✓ 已更新，下次登入請使用新密碼
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-white text-black px-5 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? "更新中…" : "更新密碼"}
          </button>
        </div>
      </form>
    </div>
  );
}
