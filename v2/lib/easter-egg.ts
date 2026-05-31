"use client";

// 在任何 API Key 輸入欄輸入 "67676767" 會觸發 — 純粹給知道梗的人看的彩蛋。
// 用 Audio() 動態建立避免占用 React state；同一個檔可以多次重播。
// 節流：兩秒內不重複播放，避免使用者一直敲鍵盤導致音檔疊在一起。

const EGG_TRIGGER = "67676767";
const EGG_AUDIO_URL =
  "https://www.myinstants.com/media/sounds/67_SQlv2Xv.mp3";
const COOLDOWN_MS = 2000;

let lastPlayed = 0;

export function maybePlayEgg(value: string): boolean {
  if (typeof window === "undefined") return false;
  if (value !== EGG_TRIGGER) return false;
  const now = Date.now();
  if (now - lastPlayed < COOLDOWN_MS) return false;
  lastPlayed = now;
  try {
    const a = new Audio(EGG_AUDIO_URL);
    a.volume = 0.9;
    // play() 必須在使用者手勢（onChange）同步呼叫鏈內，瀏覽器才允許播放
    void a.play().catch(() => {
      // 自動播放被擋掉就算了，不要 throw
    });
    return true;
  } catch {
    return false;
  }
}
