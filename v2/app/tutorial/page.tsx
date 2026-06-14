"use client";

import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {
  CameraIcon,
  DesktopIcon,
  FilmIcon,
  PhoneIcon,
} from "@/components/icons";
import { getCityId, setCityId as saveCityId } from "@/lib/storage";
import type { CityId } from "@/lib/types";

type Device = "mobile" | "desktop";

interface Step {
  title: string;
  body: string[];
  imageBase: string; // 對應 public/tutorial/{imageBase}-{device}.png
  imageAlt: string;
}

const STEPS: Step[] = [
  {
    title: "1. 首頁",
    imageBase: "home",
    imageAlt: "Trashform 首頁示意圖",
    body: [
      "進站第一眼會看到大大的「拍下廢棄物，立刻知道怎麼丟」標題，下方是上傳區域。",
      "右上角可以切換縣市（目前支援臺北市、高雄市），辨識結果會依照所選縣市的規則給出處理方式。",
      "頂部導覽列：辨識（你現在看到的主功能）、使用教學、資料庫、設定。",
    ],
  },
  {
    title: "2. 設定 Gemini API Key",
    imageBase: "api",
    imageAlt: "設定頁的 API Key 與組織代號介面",
    body: [
      "第一次使用前，需要到「設定」分頁輸入 Gemini API Key。",
      "你可以在 https://aistudio.google.com/apikey 免費申請個人 Key。",
      "如果使用組織提供的代號，就不用自己輸入 Key — 在「辨識來源模式」切到「用組織提供的代號」，再貼上代號驗證即可（不會看到實際的 Key）。",
      "Key 與代號只存在你的瀏覽器，不會上傳到我們的伺服器。",
    ],
  },
  {
    title: "3. 回收物辨識",
    imageBase: "recognize",
    imageAlt: "辨識結果頁，含信心度與當地處理方式",
    body: [
      "點擊或拖放一張照片到上傳區（手機會跳出相機/相簿選單）。",
      "按下「開始辨識」前需要先通過 Cloudflare 人機驗證（避免機器人濫用配額）。",
      "辨識完成後右側會顯示：物品名稱、信心度、所屬大類、當地處理方式、應投入的桶色、注意事項與法規依據連結。",
      "如果照片是複合材質（如手搖飲：紙杯＋吸管＋封膜），結果會自動拆解每個部件並分別告訴你怎麼丟。",
    ],
  },
  {
    title: "4. 錯誤回報",
    imageBase: "report",
    imageAlt: "回報分錯了對話框",
    body: [
      "結果不正確？按結果卡片左下的「回報分錯了」開啟回報對話框。",
      "可以選擇「應該是哪一項」並填補充說明，照片會永久保留供管理員審查與資料庫改善。",
      "如果 AI 直接回「不確定」或辨識失敗，系統也會自動歸檔成「異動回報」，你不用做任何事。",
    ],
  },
  {
    title: "5. 資料庫",
    imageBase: "catalog",
    imageAlt: "手動搜尋資料庫介面",
    body: [
      "不想拍照、想直接查的時候，切到「資料庫」分頁。",
      "可以用中文名稱或別名搜尋（例如「寶特瓶」或「PET」都查得到），結果一樣會依照當前縣市的規則顯示處理方式。",
      "目前資料庫含 60+ 項常見廢棄物，目標 101 項。",
    ],
  },
];

export default function TutorialPage() {
  const [cityId, setCityIdState] = useState<CityId>("taipei");
  const [device, setDevice] = useState<Device>("desktop");
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    setCityIdState(getCityId());
    // 偵測：寬度 < 768 或 user-agent 看起來像 mobile → 預設手機版
    const ua = navigator.userAgent || "";
    const looksMobile =
      window.matchMedia("(max-width: 767px)").matches ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    setDevice(looksMobile ? "mobile" : "desktop");
    setAutoDetected(true);
  }, []);

  const handleCityChange = useCallback((id: CityId) => {
    setCityIdState(id);
    saveCityId(id);
  }, []);

  const videoSrc =
    device === "mobile" ? "/tutorial/video-mobile.mp4" : "/tutorial/video-desktop.mp4";
  const posterSrc =
    device === "mobile"
      ? "/tutorial/video-mobile-poster.jpg"
      : "/tutorial/video-desktop-poster.jpg";

  return (
    <>
      <Header cityId={cityId} onCityChange={handleCityChange} />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* 標題與裝置切換 */}
          <header className="space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">
              使用教學
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              下面是 Trashform 的完整操作流程；先看操作影片掌握全貌，再按步驟瀏覽截圖細節。
              系統會自動依你目前的裝置顯示對應的畫面截圖，你也可以手動切換。
            </p>

            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs">
              <button
                onClick={() => setDevice("mobile")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                  device === "mobile"
                    ? "bg-white text-black font-medium"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                <PhoneIcon className="w-4 h-4" />
                手機版
              </button>
              <button
                onClick={() => setDevice("desktop")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                  device === "desktop"
                    ? "bg-white text-black font-medium"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                <DesktopIcon className="w-4 h-4" />
                電腦版
              </button>
            </div>
            {autoDetected && (
              <p className="text-[11px] text-neutral-600">
                目前顯示：{device === "mobile" ? "手機版" : "電腦版"}（已依你的裝置自動選擇，可手動切換）
              </p>
            )}
          </header>

          {/* 操作影片 — 放最前面作為 overview */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-serif text-lg sm:text-xl font-semibold">
              <FilmIcon className="w-5 h-5 text-neutral-400" />
              操作影片
            </h2>
            <p className="text-xs text-neutral-500">
              {device === "mobile"
                ? "從手機操作的完整流程錄影。"
                : "從電腦操作的完整流程錄影。"}
            </p>
            <div className="rounded-3xl overflow-hidden bg-black border border-neutral-800">
              {/*
                自動播放策略：
                  - autoPlay + muted + playsInline 是 iOS / Android Chrome 都需要的組合
                  - loop 讓教學影片循環，使用者錯過細節不用倒帶
                  - poster 顯示首幀，避免「黑底等待」的觀感
                  - preload="auto" 配合 -movflags +faststart 的影片，瀏覽器拿到
                    moov atom 後立刻開始解碼播放
                  - key={videoSrc} 在切換手機 / 桌機版時強制 reload
              */}
              <video
                key={videoSrc}
                src={videoSrc}
                poster={posterSrc}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="auto"
                className={`w-full ${
                  device === "mobile" ? "max-h-[80vh]" : ""
                } object-contain`}
              >
                你的瀏覽器不支援影片播放，請 <a href={videoSrc} className="underline">直接下載</a>。
              </video>
            </div>
          </section>

          {/* 5 步驟截圖 */}
          <section className="space-y-6">
            <h2 className="flex items-center gap-2 font-serif text-lg sm:text-xl font-semibold">
              <CameraIcon className="w-5 h-5 text-neutral-400" />
              分步驟說明
            </h2>

            <ol className="space-y-8">
              {STEPS.map((s) => {
                const imgSrc = `/tutorial/${s.imageBase}-${device}.png`;
                return (
                  <li
                    key={s.imageBase}
                    className="space-y-4 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-4 sm:p-6"
                  >
                    <h3 className="font-serif text-lg sm:text-xl font-bold">
                      {s.title}
                    </h3>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      <a
                        href={imgSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-2xl overflow-hidden bg-black border border-neutral-800 shrink-0 ${
                          device === "mobile"
                            ? "md:w-56 mx-auto md:mx-0"
                            : "md:w-1/2"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          key={imgSrc}
                          src={imgSrc}
                          alt={s.imageAlt}
                          className="w-full h-auto object-contain"
                          loading="lazy"
                        />
                      </a>

                      <div className="flex-1 space-y-2 text-sm text-neutral-300 leading-relaxed">
                        {s.body.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="text-center text-sm text-neutral-500">
            還有問題？歡迎在「辨識」結果頁回報，或回到{" "}
            <a href="/" className="text-blue-400 hover:underline">
              首頁
            </a>
            開始試試。
          </div>

          <Footer />
        </div>
      </main>
    </>
  );
}
