"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminLoginRequest } from "@/lib/api-contracts";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body: AdminLoginRequest = { username, password };
    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data?.error ?? "登入失敗，請確認帳號與密碼");
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col gap-5"
    >
      <div>
        <h1 className="font-serif font-bold text-2xl">
          <span style={{ color: "#00a96f" }}>T</span>
          rash
          <span style={{ color: "#fb9c00" }}>f</span>
          orm
          <span className="ml-2 text-xs font-mono text-neutral-500">admin</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-400">後台登入</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-neutral-400">帳號</span>
        <input
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-neutral-400">密碼</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
        />
      </label>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-white text-black py-2.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
      >
        {loading ? "登入中…" : "登入"}
      </button>

      <p className="text-xs text-neutral-500 leading-relaxed">
        預設密碼登入後，請至「修改密碼」變更。
      </p>

      <Link
        href="/"
        className="text-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        ← 回到首頁
      </Link>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10 bg-black text-neutral-100">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
