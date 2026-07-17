// Live-scrapes grade/cultivar/region directly from product pages, for
// products where the archived research text never captured one of these
// fields. Same rationale and same infrastructure as scrape-live-prices.mjs:
// the archived research is a point-in-time text snapshot and keyword-matches
// against it, which misses fields the current page states plainly just
// because the original research pass didn't happen to record that exact
// text. A plain HTML fetch is enough here (unlike price, which sometimes
// needs JS-rendered variant data) -- grade/cultivar/region marketing copy is
// almost always server-rendered.
//
// Results accumulate in data/live-attributes.json, keyed by product id, so
// re-running never clobbers earlier progress. build-db.mjs only uses an
// entry to fill a gap the archived-text extraction left null -- it never
// overrides an archived-text match.
//
// Usage: node scripts/scrape-live-attributes.mjs [--retry-failed]

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRADE_KEYWORDS, CULTIVAR_KEYWORDS, REGION_KEYWORDS, findFirstKeyword } from "./attribute-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "matcha.db");
const OUT_PATH = path.join(__dirname, "..", "data", "live-attributes.json");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
const CHALLENGE_RE =
  /verifying your connection|just a moment|checking your browser|attention required|access denied|captcha/i;

const RETRY_FAILED = process.argv.includes("--retry-failed");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      const html = await res.text();
      const blocked =
        res.status === 429 || res.status === 403 || res.status === 503 || CHALLENGE_RE.test(html.slice(0, 2000));
      if (blocked) {
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
          continue;
        }
        return { blocked: true, status: res.status };
      }
      return { ok: true, status: res.status, html };
    } catch (err) {
      if (i === attempts - 1) return { error: String(err.message || err) };
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

// Deliberately scoped to ONLY the page's own title + description tags --
// never the full body text. Tested against the full page first and it
// produced a real false positive: Aiya's own "Culinary Grade Matcha" page
// got tagged grade=ceremonial, because "ceremonial" appeared somewhere in a
// "you may also like" cross-sell block elsewhere on the page, and keyword
// matching has no notion of "whose grade is this actually describing" --
// first match in keyword order wins regardless of where on the page it sits.
// Title/meta/og tags are near-universally about THIS product specifically
// (that's their whole purpose), so they're a much narrower, more reliable
// source, at the cost of missing whatever's only mentioned in body copy.
function extractPageText(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
  const parts = [titleMatch?.[1] || "", descMatch?.[1] || "", ogTitleMatch?.[1] || "", ogDescMatch?.[1] || ""];
  return parts
    .join(" | ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function scrapeOne(product) {
  const res = await fetchWithRetry(product.source_url, RETRY_FAILED ? 4 : 3);
  if (res?.blocked) return { ...product, status: "blocked", httpStatus: res.status };
  if (res?.error) return { ...product, status: "fetch_error", detail: res.error };
  if (!res?.ok) return { ...product, status: "fetch_failed" };

  const text = extractPageText(res.html);
  const lower = text.toLowerCase();
  const grade = findFirstKeyword(lower, GRADE_KEYWORDS);
  const cultivar = findFirstKeyword(lower, CULTIVAR_KEYWORDS);
  const region = findFirstKeyword(lower, REGION_KEYWORDS);

  if (!grade && !cultivar && !region) {
    return { ...product, status: "no_attributes_found", httpStatus: res.status };
  }

  return {
    ...product,
    status: "ok",
    scrapedAt: new Date().toISOString(),
    grade,
    cultivar,
    region,
  };
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const res = db.exec(`
    SELECT p.id, b.name, p.product_name, p.source_url
    FROM products p JOIN brands b ON p.brand_id = b.id
    WHERE p.source_url IS NOT NULL
      AND (p.grade IS NULL OR p.cultivar IS NULL OR p.region IS NULL)
  `);
  let rows = res[0].values.map(([id, brand, product_name, source_url]) => ({ id, brand, product_name, source_url }));

  const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) : {};

  if (RETRY_FAILED) {
    const failedIds = new Set(
      Object.values(existing)
        .filter((r) => r.status !== "ok")
        .map((r) => r.id)
    );
    rows = rows.filter((p) => failedIds.has(p.id));
    console.log(`RETRY: ${rows.length} previously-failed products`);
  } else {
    // Skip anything already scraped ok in a previous run of this script.
    rows = rows.filter((p) => !existing[p.id] || existing[p.id].status !== "ok");
    console.log(`${rows.length} products missing grade/cultivar/region to scrape`);
  }

  if (LIMIT) {
    rows = rows.slice(0, LIMIT);
    console.log(`--limit=${LIMIT}: testing on first ${rows.length}`);
  }

  const byDomain = new Map();
  for (const p of rows) {
    let d;
    try {
      d = new URL(p.source_url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(p);
  }
  console.log(`across ${byDomain.size} domains`);

  const results = [];
  let done = 0;
  const perRequestDelay = RETRY_FAILED ? 2500 : 500;
  async function runDomain(domainProducts) {
    for (const p of domainProducts) {
      const r = await scrapeOne(p);
      results.push(r);
      done++;
      if (done % 25 === 0) console.log(`  ...${done}/${rows.length}`);
      await new Promise((r) => setTimeout(r, perRequestDelay));
    }
  }

  const domainGroups = [...byDomain.values()];
  const CONCURRENT_DOMAINS = RETRY_FAILED ? 2 : 6;
  for (let i = 0; i < domainGroups.length; i += CONCURRENT_DOMAINS) {
    await Promise.all(domainGroups.slice(i, i + CONCURRENT_DOMAINS).map(runDomain));
  }

  for (const r of results) {
    existing[r.id] = r;
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));

  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("\n=== Summary ===");
  for (const [status, count] of Object.entries(byStatus)) console.log(`  ${status}: ${count}`);
  const foundGrade = results.filter((r) => r.status === "ok" && r.grade).length;
  const foundCultivar = results.filter((r) => r.status === "ok" && r.cultivar).length;
  const foundRegion = results.filter((r) => r.status === "ok" && r.region).length;
  console.log(`  grade found: ${foundGrade}, cultivar found: ${foundCultivar}, region found: ${foundRegion}`);
  console.log(`\nWrote ${OUT_PATH} (${Object.keys(existing).length} products total)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
