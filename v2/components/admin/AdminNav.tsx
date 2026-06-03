"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "儀表板" },
  { href: "/admin/records", label: "辨識紀錄" },
  { href: "/admin/reports", label: "錯誤回報" },
  { href: "/admin/orgs", label: "組織代號" },
  { href: "/admin/eco-facts", label: "環保冷知識" },
  { href: "/admin/change-password", label: "修改密碼" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* ignore */
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:h-dvh md:sticky md:top-0 border-r border-neutral-900 bg-neutral-950">
        <div
          className="px-5 py-5 border-b border-neutral-900"
          // iPad PWA：避開頂端狀態列
          style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
        >
          <Link href="/admin" className="font-serif font-extrabold text-2xl leading-none">
            <span style={{ color: "#00a96f" }}>T</span>
            rash
            <span style={{ color: "#fb9c00" }}>f</span>
            orm
            <span className="ml-2 text-[10px] font-mono text-neutral-500 align-top">
              admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-2 rounded-2xl text-sm transition-colors ${
                isActive(n.href)
                  ? "bg-white text-black font-medium"
                  : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-neutral-900">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-3 py-2 rounded-full border border-neutral-800 text-sm text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
          >
            {loggingOut ? "登出中…" : "登出"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-neutral-900"
        // 同 Header：避開 iOS PWA Dynamic Island
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="font-serif font-extrabold text-xl">
            <span style={{ color: "#00a96f" }}>T</span>
            rash
            <span style={{ color: "#fb9c00" }}>f</span>
            orm
            <span className="ml-1 text-[10px] font-mono text-neutral-500">admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-1.5 rounded-full border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
            >
              {loggingOut ? "…" : "登出"}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="px-3 py-1.5 rounded-full bg-neutral-900 text-xs text-neutral-200"
              aria-label="切換選單"
            >
              {mobileOpen ? "關閉" : "選單"}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="px-3 pb-3 flex flex-wrap gap-1.5 border-t border-neutral-900 pt-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  isActive(n.href)
                    ? "bg-white text-black font-medium"
                    : "bg-neutral-900 text-neutral-300 hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
