"use client";

import type { CityId } from "@/lib/types";

interface Props {
  value: CityId;
  onChange: (id: CityId) => void;
}

export default function CityPicker({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-neutral-400">
      <span className="hidden sm:inline">縣市</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CityId)}
        className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
      >
        <option value="taipei">臺北市</option>
        <option value="kaohsiung">高雄市</option>
      </select>
    </label>
  );
}
