"use client";

import type { CityId, ReportEntry } from "./types";

const KEY = {
  apiKey: "tf:apiKey",
  city: "tf:cityId",
  reports: "tf:reports",
} as const;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 忽略：可能是無痕模式或配額已滿
  }
}

function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

// ─── API Key ──────────────────────────────────────────────────────────────
export function getApiKey(): string {
  return safeGet(KEY.apiKey) ?? "";
}

export function setApiKey(key: string) {
  if (key) safeSet(KEY.apiKey, key);
  else safeRemove(KEY.apiKey);
}

// ─── 縣市 ────────────────────────────────────────────────────────────────
export function getCityId(): CityId {
  const v = safeGet(KEY.city);
  return v === "kaohsiung" ? "kaohsiung" : "taipei";
}

export function setCityId(id: CityId) {
  safeSet(KEY.city, id);
}

// ─── 錯誤回報 ─────────────────────────────────────────────────────────────
export function getReports(): ReportEntry[] {
  const raw = safeGet(KEY.reports);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addReport(entry: ReportEntry) {
  const list = [entry, ...getReports()].slice(0, 50);
  safeSet(KEY.reports, JSON.stringify(list));
}

// ─── 全清 ────────────────────────────────────────────────────────────────
export function clearAll() {
  safeRemove(KEY.apiKey);
  safeRemove(KEY.city);
  safeRemove(KEY.reports);
}
