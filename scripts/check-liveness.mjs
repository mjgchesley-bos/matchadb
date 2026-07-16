// Checks every product's source_url for a real HTTP 404/410 (confirmed
// discontinued/removed page). Deliberately conservative: only a literal
// 404/410 status is treated as "confirmed removed" — everything else (bot
// blocks, timeouts, redirects to a homepage, rate limiting) is bucketed
// separately for manual review, since auto-removing a product on a false
// positive (e.g. Amazon returning 503 to a script) would silently delete
// real data.
//
// Usage: node scripts/check-liveness.mjs

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "matcha.db");
const OUT_PATH = path.join(__dirname, "..", "data", "liveness-check.json");

const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function checkOne(id, brand, product, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    clearTimeout(timer);
    const status = res.status;
    const finalUrl = res.url;
    let bucket;
    if (status === 404 || status === 410) {
      bucket = "confirmed_404";
    } else if (status >= 200 && status < 300) {
      bucket = "live";
    } else if (status === 403 || status === 429 || status >= 500) {
      bucket = "blocked_or_error";
    } else {
      bucket = "other_status";
    }
    return { id, brand, product, url, status, finalUrl, bucket };
  } catch (err) {
    clearTimeout(timer);
    return { id, brand, product, url, status: null, error: String(err.message || err), bucket: "check_failed" };
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner));
  return results;
}

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  const res = db.exec(`
    SELECT p.id, b.name, p.product_name, p.source_url
    FROM products p JOIN brands b ON p.brand_id = b.id
    WHERE p.source_url IS NOT NULL
    ORDER BY p.id
  `);
  const rows = res[0].values;
  console.log(`Checking ${rows.length} product URLs (concurrency ${CONCURRENCY})...`);

  let done = 0;
  const results = await runPool(
    rows,
    async ([id, brand, product, url]) => {
      const r = await checkOne(id, brand, product, url);
      done++;
      if (done % 50 === 0) console.log(`  ...${done}/${rows.length}`);
      return r;
    },
    CONCURRENCY
  );

  const buckets = {};
  for (const r of results) {
    buckets[r.bucket] = (buckets[r.bucket] || 0) + 1;
  }
  console.log("\nResults:");
  for (const [bucket, count] of Object.entries(buckets)) {
    console.log(`  ${bucket}: ${count}`);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
