"use client";

import { useMemo, useState } from "react";
import {
  GROUP_EMOJI,
  GROUP_LABELS,
  getDisposal,
  items as ALL_ITEMS,
} from "@/lib/catalog";
import type { CategoryGroup, CityId, Item } from "@/lib/types";

interface Props {
  cityId: CityId;
  cityName: string;
  initialQuery?: string;
}

const GROUPS: CategoryGroup[] = [
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
];

export default function ManualSearch({ cityId, cityName, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [activeGroup, setActiveGroup] = useState<CategoryGroup | "all">("all");
  const [openItem, setOpenItem] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ITEMS.filter((it) => {
      if (activeGroup !== "all" && it.group !== activeGroup) return false;
      if (!q) return true;
      if (it.nameZh.toLowerCase().includes(q)) return true;
      return it.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [query, activeGroup]);

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋廢棄物名稱（例：紙餐盒、寶特瓶、燈管）"
        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-600"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Chip
          active={activeGroup === "all"}
          onClick={() => setActiveGroup("all")}
        >
          全部
        </Chip>
        {GROUPS.map((g) => (
          <Chip
            key={g}
            active={activeGroup === g}
            onClick={() => setActiveGroup(g)}
          >
            {GROUP_EMOJI[g]} {GROUP_LABELS[g]}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {filtered.length === 0 ? (
          <p className="col-span-full text-sm text-neutral-500 py-12 text-center">
            找不到符合的項目。
          </p>
        ) : (
          filtered.map((it) => (
            <button
              key={it.id}
              onClick={() => setOpenItem(it)}
              className="text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl p-3 transition-colors"
            >
              <div className="text-2xl mb-1">{it.emoji ?? GROUP_EMOJI[it.group]}</div>
              <div className="text-sm text-neutral-200 font-medium">{it.nameZh}</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">
                {GROUP_LABELS[it.group]}
              </div>
            </button>
          ))
        )}
      </div>

      {openItem && (
        <ItemDetail
          item={openItem}
          cityId={cityId}
          cityName={cityName}
          onClose={() => setOpenItem(null)}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
        active
          ? "bg-white text-black"
          : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function ItemDetail({
  item,
  cityId,
  cityName,
  onClose,
}: {
  item: Item;
  cityId: CityId;
  cityName: string;
  onClose: () => void;
}) {
  const { rule, isItemSpecific } = getDisposal(cityId, item);
  const tips = [...(rule.notes ?? []), ...(item.defaultTips ?? [])];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{item.emoji ?? GROUP_EMOJI[item.group]}</span>
            <div>
              <h2 className="font-serif text-lg font-bold">{item.nameZh}</h2>
              <p className="text-xs text-neutral-500">{GROUP_LABELS[item.group]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-xl leading-none px-2"
            aria-label="關閉"
          >
            ×
          </button>
        </header>

        <div className="space-y-4">
          <section className="space-y-1.5">
            <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-serif">
              {cityName}處理方式
            </h3>
            <p className="text-sm text-neutral-200 leading-relaxed">
              {rule.disposal}
            </p>
            {!isItemSpecific && (
              <p className="text-[10px] text-neutral-600">使用大類預設規則</p>
            )}
          </section>

          {rule.binColor && (
            <div className="text-sm text-neutral-400 bg-neutral-900 rounded-xl px-4 py-3">
              🗑️ 投入：<strong className="text-neutral-100">{rule.binColor}</strong>
            </div>
          )}

          {tips.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-serif">
                注意事項
              </h3>
              <ul className="space-y-1.5">
                {tips.map((t, i) => (
                  <li key={i} className="text-sm text-neutral-400 flex gap-2">
                    <span className="text-neutral-700 shrink-0">·</span>
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.aliases.length > 0 && (
            <p className="text-xs text-neutral-600">
              別名：{item.aliases.join("、")}
            </p>
          )}

          {rule.sourceUrl && (
            <a
              href={rule.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-blue-400 hover:underline"
            >
              🔗 法規依據
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
