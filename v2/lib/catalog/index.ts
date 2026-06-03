import itemsJson from "./items.json";
import taipeiJson from "./rules/taipei.json";
import kaohsiungJson from "./rules/kaohsiung.json";
import type {
  CategoryGroup,
  CityId,
  CityItemRule,
  CityRule,
  Item,
} from "../types";

export const items = itemsJson as Item[];

const itemsById = new Map<string, Item>(items.map((it) => [it.id, it]));

export function getItem(id: string): Item | undefined {
  return itemsById.get(id);
}

export function listByGroup(group: CategoryGroup): Item[] {
  return items.filter((it) => it.group === group);
}

export function searchItems(query: string): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((it) => {
    if (it.nameZh.toLowerCase().includes(q)) return true;
    return it.aliases.some((a) => a.toLowerCase().includes(q));
  });
}

const cityRules: Record<CityId, CityRule> = {
  taipei: taipeiJson as CityRule,
  kaohsiung: kaohsiungJson as CityRule,
};

export function getCityRule(cityId: CityId): CityRule {
  return cityRules[cityId];
}

// 目前支援的所有縣市（依設定檔順序）
export const CITY_IDS = Object.keys(cityRules) as CityId[];

export interface CityDisposal {
  cityId: CityId;
  cityName: string;
  rule: CityItemRule;
  isItemSpecific: boolean;
}

// 取得同一物品在所有縣市的處理方式，供結果頁做「縣市差異」比較。
export function getAllDisposals(item: Item): CityDisposal[] {
  return CITY_IDS.map((cityId) => {
    const { rule, isItemSpecific } = getDisposal(cityId, item);
    return { cityId, cityName: cityRules[cityId].cityName, rule, isItemSpecific };
  });
}

// 各縣市處理方式（disposal + 投入桶）是否真的有差異。
// 全部相同時前端可省略比較區塊，避免誤導使用者「縣市沒差」。
export function disposalsDiffer(item: Item): boolean {
  const all = getAllDisposals(item);
  if (all.length < 2) return false;
  const key = (d: CityDisposal) => `${d.rule.disposal}|${d.rule.binColor ?? ""}`;
  const first = key(all[0]);
  return all.some((d) => key(d) !== first);
}

export function getDisposal(
  cityId: CityId,
  item: Item
): { rule: CityItemRule; isItemSpecific: boolean } {
  const city = cityRules[cityId];
  const itemRule = city.items[item.id];
  if (itemRule) return { rule: itemRule, isItemSpecific: true };
  const groupRule = city.groupDefaults[item.group];
  return {
    rule: {
      disposal: groupRule.disposal,
      binColor: groupRule.binColor,
      sourceUrl: groupRule.sourceUrl,
    },
    isItemSpecific: false,
  };
}

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  paper: "紙類",
  plastic: "塑膠",
  glass: "玻璃",
  metal: "金屬",
  food: "廚餘",
  general: "一般垃圾",
  hazardous: "有害廢棄物",
  large: "大型廢棄物",
  electronics: "廢電器電子",
  clothing: "舊衣物",
};

export const GROUP_EMOJI: Record<CategoryGroup, string> = {
  paper: "📄",
  plastic: "♻️",
  glass: "🍶",
  metal: "🥫",
  food: "🍎",
  general: "🗑️",
  hazardous: "⚠️",
  large: "🛋️",
  electronics: "📱",
  clothing: "👕",
};
