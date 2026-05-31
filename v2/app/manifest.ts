import type { MetadataRoute } from "next";

// PWA manifest — served at /manifest.webmanifest by Next.
// Triggers Chrome / Edge / Samsung Internet "Add to Home screen" install
// prompts once paired with the service worker registered in layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trashform — 台灣回收 AI 小幫手",
    short_name: "Trashform",
    description:
      "拍下廢棄物，AI 立刻告訴你怎麼回收 — 支援臺北市、高雄市。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "zh-TW",
    categories: ["education", "utilities", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
