// Admin one-shot：把 10 則「環保地獄梗」種子寫進 eco_facts。
// 圖片本身是 commit 進 public/eco-memes/ 的靜態檔，這裡只負責插 DB row。
//
// 策略（upsert by content）：
//   - 若 content 已存在 → UPDATE image_url（讓重跑可以更新圖）
//   - 否則 INSERT 一筆新的（active 預設 TRUE）
// 這樣 admin 重複點按鈕也安全，不會產生重複資料。

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ECO_MEME_SEEDS, memeImageUrl } from "@/lib/eco-meme-seeds";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  try {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const seed of ECO_MEME_SEEDS) {
      const imageUrl = memeImageUrl(seed);
      try {
        // 先查是否已存在（用 content 完全比對）
        const existing = await sql<{ id: number }>`
          SELECT id FROM eco_facts WHERE content = ${seed.content} LIMIT 1
        `;
        if (existing.rows.length > 0) {
          await sql`
            UPDATE eco_facts
            SET image_url = ${imageUrl}, updated_at = NOW()
            WHERE id = ${existing.rows[0].id}
          `;
          updated += 1;
        } else {
          await sql`
            INSERT INTO eco_facts (content, image_url, active)
            VALUES (${seed.content}, ${imageUrl}, TRUE)
          `;
          inserted += 1;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${seed.filename}: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      total: ECO_MEME_SEEDS.length,
      inserted,
      updated,
      errors,
    });
  } catch (err) {
    console.error("[/api/admin/eco-facts/seed-memes] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
