// One-shot: list all error-report blobs and print total size.
// Run: BLOB_READ_WRITE_TOKEN=... npx tsx scripts/blob-stats.ts

import { list } from "@vercel/blob";

async function main() {
  let cursor: string | undefined = undefined;
  let total = 0;
  let count = 0;
  const byExt: Record<string, { count: number; bytes: number }> = {};
  // also print the 5 largest so we know what we're dealing with
  const largest: { pathname: string; size: number }[] = [];

  do {
    const res: Awaited<ReturnType<typeof list>> = await list({
      prefix: "error-reports/",
      cursor,
      limit: 1000,
    });
    for (const b of res.blobs) {
      total += b.size;
      count += 1;
      const m = b.pathname.match(/\.[a-z0-9]+$/i);
      const ext = (m ? m[0] : "(none)").toLowerCase();
      const slot = byExt[ext] ?? { count: 0, bytes: 0 };
      slot.count += 1;
      slot.bytes += b.size;
      byExt[ext] = slot;
      largest.push({ pathname: b.pathname, size: b.size });
    }
    cursor = res.cursor;
  } while (cursor);

  largest.sort((a, b) => b.size - a.size);

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

  console.log("=== error-reports/ blob stats ===");
  console.log(`count: ${count}`);
  console.log(`total: ${mb(total)} (${total} bytes)`);
  console.log("by extension:");
  for (const [ext, v] of Object.entries(byExt).sort(
    (a, b) => b[1].bytes - a[1].bytes,
  )) {
    console.log(`  ${ext.padEnd(8)} ${String(v.count).padStart(4)}  ${mb(v.bytes)}`);
  }
  console.log("largest 10:");
  for (const b of largest.slice(0, 10)) {
    console.log(`  ${mb(b.size).padStart(10)}  ${b.pathname}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
