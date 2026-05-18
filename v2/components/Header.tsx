"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CityPicker from "./CityPicker";
import type { CityId } from "@/lib/types";

interface HeaderProps {
  cityId: CityId;
  onCityChange: (id: CityId) => void;
}

// shortLabel 在手機上顯示，label 在 sm+ 顯示；可以差兩字 = 多 ~40px 給其他 nav
const NAV: { href: string; label: string; shortLabel?: string }[] = [
  { href: "/", label: "辨識" },
  { href: "/tutorial", label: "使用教學", shortLabel: "教學" },
  { href: "/catalog", label: "資料庫" },
  { href: "/settings", label: "設定" },
];

export default function Header({ cityId, onCityChange }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-neutral-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-serif font-extrabold text-xl sm:text-2xl leading-none">
            <span style={{ color: "#00a96f" }}>T</span>
            rash
            <span style={{ color: "#fb9c00" }}>f</span>
            orm
          </span>
          <span className="text-[10px] font-mono text-neutral-600 mt-1.5 hidden sm:inline">
            v2
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-2 text-sm min-w-0">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-2 sm:px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                {n.shortLabel ? (
                  <>
                    <span className="sm:hidden">{n.shortLabel}</span>
                    <span className="hidden sm:inline">{n.label}</span>
                  </>
                ) : (
                  n.label
                )}
              </Link>
            );
          })}
        </nav>

        <CityPicker value={cityId} onChange={onCityChange} />
      </div>
    </header>
  );
}
