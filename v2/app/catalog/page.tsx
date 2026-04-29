"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ManualSearch from "@/components/ManualSearch";
import { getCityRule } from "@/lib/catalog";
import { getCityId, setCityId as saveCityId } from "@/lib/storage";
import type { CityId } from "@/lib/types";

export default function CatalogPage() {
  const [cityId, setCityId] = useState<CityId>("taipei");

  useEffect(() => {
    setCityId(getCityId());
  }, []);

  function handleCityChange(id: CityId) {
    setCityId(id);
    saveCityId(id);
  }

  const cityName = getCityRule(cityId).cityName;

  return (
    <>
      <Header cityId={cityId} onCityChange={handleCityChange} />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto space-y-5">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">資料庫</h1>
            <p className="text-sm text-neutral-500">
              手動搜尋常見廢棄物的{cityName}處理方式。AI 無法辨識時，可在這裡直接查詢。
            </p>
          </header>

          <ManualSearch cityId={cityId} cityName={cityName} />
        </div>
      </main>
    </>
  );
}
