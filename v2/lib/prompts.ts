import { GROUP_LABELS } from "./catalog";
import type { CategoryGroup, Item } from "./types";

export function buildBroadPrompt(itemList: Item[]) {
  const groupList = (Object.keys(GROUP_LABELS) as CategoryGroup[])
    .map((g) => `- ${g}：${GROUP_LABELS[g]}`)
    .join("\n");

  // 將 item 依 group 列出簡短清單，提供模型作為「候選 itemId」依據
  const grouped = new Map<CategoryGroup, Item[]>();
  for (const it of itemList) {
    if (!grouped.has(it.group)) grouped.set(it.group, []);
    grouped.get(it.group)!.push(it);
  }

  const itemBrief = Array.from(grouped.entries())
    .map(([g, list]) => {
      const ids = list.map((it) => `${it.id}（${it.nameZh}）`).join("、");
      return `[${g}] ${ids}`;
    })
    .join("\n");

  return `你是台灣廢棄物分類助理。使用者會上傳 1~3 張物品照片，請辨識並回傳 JSON。

【可用大類 group】
${groupList}

【可用 itemId（請從中挑選，不可發明新 ID）】
${itemBrief}

請回傳兩種 JSON 之一：

【情況 A：可辨識】
{
  "status": "identified",
  "itemId": "上方某個 itemId",
  "itemName": "你判定的物品中文名稱（可比 itemId 對應名更具體）",
  "group": "paper|plastic|glass|metal|food|general|hazardous|large|electronics|clothing",
  "confidence": "high|medium|low",
  "explanation": "1~2 句話說明判斷依據與注意事項",
  "components": [
    // 選填：物品由「多種需分別丟棄的材質」組成時才填
    { "itemId": "...", "itemName": "...", "group": "..." }
  ]
}

【情況 B：無法確定】
{
  "status": "uncertain",
  "partialName": "如能猜出大致名稱可填，否則省略",
  "candidateItemIds": ["可能的 itemId 1", "可能的 itemId 2"],
  "questions": [
    { "id": "q1", "q": "問題敘述", "options": ["選項1", "選項2", "不確定"] }
  ],
  "requestBetterImage": false
}

規則：
- itemId 必須來自上方清單；group 必須是上方 10 種之一。
- confidence 對應大致機率：high≥90%、medium 60-90%、low<60%。
- 若你的 confidence 為 low，建議改回傳 uncertain 並提供 questions（最多 3 題）以縮小範圍。
- 只回傳 JSON，不要 markdown 圍欄、不要其他文字。

【複合材質物品（重要）】
若物品由「多個需要分別丟棄的可分離部件」組成（如手搖飲＝紙杯＋塑膠吸管＋塑膠封膜、便當＝紙餐盒＋塑膠湯匙、外帶咖啡＝紙杯＋塑膠杯蓋），請：
1. itemId / itemName / group 仍填整體最具代表性的部件（通常是體積最大者，如「紙杯」）。
2. 額外填入 components 陣列，列出**每個應分別處理的部件**（包含主體本身），每個元素也是 { itemId, itemName, group }，itemId 必須來自上方清單。
3. explanation 中提醒「請拆解後分別處理」。
4. 單一材質（如一個寶特瓶、一張紙）請勿填 components。

範例（手搖飲料）：
{
  "status": "identified",
  "itemId": "paper_cup",
  "itemName": "手搖飲（含杯、吸管、封膜）",
  "group": "paper",
  "confidence": "high",
  "explanation": "此為手搖飲，紙杯為主體，請拆解後分別處理：紙杯歸紙容器、塑膠吸管與封膜歸一般垃圾。",
  "components": [
    { "itemId": "paper_cup", "itemName": "外層紙杯", "group": "paper" },
    { "itemId": "straw", "itemName": "塑膠吸管", "group": "general" },
    { "itemId": "plastic_bag", "itemName": "塑膠封膜", "group": "general" }
  ]
}`;
}

export function buildClarifyPrompt(
  candidateItems: Item[],
  qa: { q: string; a: string }[]
) {
  const candidateText = candidateItems
    .map((it) => `- ${it.id}：${it.nameZh}（${it.aliases.slice(0, 3).join("、")}）`)
    .join("\n");

  const qaText = qa.map((p, i) => `Q${i + 1}: ${p.q}\nA${i + 1}: ${p.a}`).join("\n");

  return `根據以下追問結果，請從候選 itemId 中選出最可能者，回傳 identified JSON（confidence 至少為 medium）。
若仍無法判斷，回傳 status="uncertain" 並要求 better image。

【候選】
${candidateText}

【使用者回答】
${qaText}

只回傳 JSON。`;
}
