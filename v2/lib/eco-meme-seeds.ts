// 「環保地獄梗」種子資料 — 給 scripts/generate-eco-memes.ts 用來渲圖，
// 也給 /api/admin/eco-facts/seed-memes 用來 upsert DB。兩邊吃同一份來源確保一致。
//
// 每則：
//   content  — 存進 eco_facts.content，辨識中 ticker 會顯示這段純文字
//   filename — public/eco-memes/<filename>.png；插入 DB 的 image_url 也是這個路徑
//   lines    — 圖片上的分行排版（空字串代表上下段空白）

export interface EcoMemeSeed {
  content: string;
  filename: string; // 不含副檔名
  lines: string[];
}

export const ECO_MEME_SEEDS: EcoMemeSeed[] = [
  {
    content:
      "「資源回收三大原則：分類、洗淨、瀝乾。」我的人生：第一點就過不去了。",
    filename: "hell-01-recycle-3-rules",
    lines: [
      "「資源回收三大原則：",
      "分類、洗淨、瀝乾。」",
      "",
      "我的人生：",
      "第一點就過不去了。",
    ],
  },
  {
    content: "冰山融化的速度比我畢業還快——至少冰山在減量。",
    filename: "hell-02-iceberg-vs-graduation",
    lines: ["冰山融化的速度", "比我畢業還快。", "", "至少冰山在減量。"],
  },
  {
    content: "2100 年的奧運新項目：游泳。場地：全世界。",
    filename: "hell-03-2100-olympics",
    lines: ["2100 年的奧運新項目：", "游泳。", "", "場地：全世界。"],
  },
  {
    content: "「為了地球，少用一次性產品。」我：好的，下次再用就好。",
    filename: "hell-04-one-time-use",
    lines: [
      "「為了地球，",
      "少用一次性產品。」",
      "",
      "我：好的，",
      "下次再用就好。",
    ],
  },
  {
    content: "「節能減碳人人有責！」我有責，地球也有責任接受結果。",
    filename: "hell-05-everyone-responsible",
    lines: [
      "「節能減碳人人有責！」",
      "",
      "我有責，",
      "地球也有責任接受結果。",
    ],
  },
  {
    content:
      "微塑膠終於進入人類血液——恭喜，「人類塑膠化」千年大計達成。",
    filename: "hell-06-microplastic-bloodstream",
    lines: [
      "微塑膠終於進入",
      "人類血液——",
      "",
      "恭喜，「人類塑膠化」",
      "千年大計達成。",
    ],
  },
  {
    content:
      "環保署：「禁止亂丟垃圾。」海洋：「不用客氣，我自己已經是垃圾了。」",
    filename: "hell-07-epa-vs-ocean",
    lines: [
      "環保署：",
      "「禁止亂丟垃圾。」",
      "",
      "海洋：「不用客氣，",
      "我自己已經是垃圾了。」",
    ],
  },
  {
    content:
      "「我們會留下乾淨地球給下一代。」下一代：「謝了，我們已經決定不生了。」",
    filename: "hell-08-next-generation",
    lines: [
      "「我們會留下",
      "乾淨地球給下一代。」",
      "",
      "下一代：「謝了，",
      "我們已經決定不生了。」",
    ],
  },
  {
    content:
      "海龜：「人類好像不太行欸。」海洋：「他剛吃了你的吸管，先別講話。」",
    filename: "hell-09-turtle-vs-ocean",
    lines: [
      "海龜：",
      "「人類好像不太行欸。」",
      "",
      "海洋：「他剛吃了你的吸管，",
      "先別講話。」",
    ],
  },
  {
    content: "地球：「我給你們 46 億年。」人類：「謝謝，200 年就夠了。」",
    filename: "hell-10-earth-vs-human",
    lines: [
      "地球：",
      "「我給你們 46 億年。」",
      "",
      "人類：「謝謝，",
      "200 年就夠了。」",
    ],
  },
];

// 公開路徑：本地 generator 把 PNG 寫進 public/eco-memes/，
// 部署後 admin seed endpoint 用這條 URL 寫進 eco_facts.image_url。
export function memeImageUrl(seed: EcoMemeSeed): string {
  return `/eco-memes/${seed.filename}.png`;
}
