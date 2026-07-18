// Live-scrapes a product's own description (JSON-LD Product.description, or
// Shopify's `var meta` product.description as a fallback) for products with
// no taste/flavor/aroma data anywhere in the archived research. Unlike
// scrape-live-attributes.mjs (deliberately scoped to title/meta only, since
// full body text pollutes grade/region matches with cross-sell mentions),
// a product's own JSON-LD/Shopify description field is safe to use in full
// here -- it's the retailer's own description of THIS specific product, not
// page-wide text that could describe something else, so there's no
// equivalent cross-contamination risk.
//
// Results accumulate in data/live-taste.json, keyed by product id.
// build-db.mjs only uses an entry as a fallback when the archived-text
// consolidation (taste-extract.mjs) found nothing at all for that product.
//
// Usage: node scripts/scrape-live-taste.mjs [--retry-failed] [--limit=N]

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FLAVOR_TAGS } from "./flavor-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "matcha.db");
const OUT_PATH = path.join(__dirname, "..", "data", "live-taste.json");

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

function extractBalancedObject(text, startIndex) {
  let depth = 0,
    inString = false,
    stringChar = "",
    escaped = false;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&deg;/g, "°")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function descriptionFromJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const b of blocks) {
    let data;
    try {
      data = JSON.parse(b[1]);
    } catch {
      continue;
    }
    const graph = Array.isArray(data) ? data : data["@graph"] || [data];
    const product = graph.find((g) => g["@type"] === "Product");
    if (product?.description) return String(product.description);
  }
  return null;
}

function descriptionFromShopifyVarMeta(html) {
  const start = html.match(/var\s+meta\s*=\s*\{/);
  if (!start) return null;
  const braceIndex = start.index + start[0].length - 1;
  const jsonText = extractBalancedObject(html, braceIndex);
  if (!jsonText) return null;
  try {
    const meta = JSON.parse(jsonText);
    return meta?.product?.description || null;
  } catch {
    return null;
  }
}

const ALL_TASTE_KEYWORDS = FLAVOR_TAGS.flatMap((f) => f.keywords);
const GENERIC_TASTE_WORDS = ["taste", "tasting", "flavor", "flavour", "aroma", "sip", "brew"];
function hasTasteContent(text) {
  const lower = text.toLowerCase();
  return [...ALL_TASTE_KEYWORDS, ...GENERIC_TASTE_WORDS].some((kw) => lower.includes(kw));
}

async function scrapeOne(product) {
  const res = await fetchWithRetry(product.source_url, RETRY_FAILED ? 4 : 3);
  if (res?.blocked) return { ...product, status: "blocked", httpStatus: res.status };
  if (res?.error) return { ...product, status: "fetch_error", detail: res.error };
  if (!res?.ok) return { ...product, status: "fetch_failed" };

  const rawDescription = descriptionFromJsonLd(res.html) || descriptionFromShopifyVarMeta(res.html);
  if (!rawDescription) return { ...product, status: "no_description_found", httpStatus: res.status };

  const cleaned = stripHtml(rawDescription).slice(0, 700);
  if (!hasTasteContent(cleaned)) {
    return { ...product, status: "no_taste_content_found", httpStatus: res.status };
  }

  return { ...product, status: "ok", scrapedAt: new Date().toISOString(), description: cleaned };
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const res = db.exec(`
    SELECT p.id, b.name, p.product_name, p.source_url
    FROM products p JOIN brands b ON p.brand_id = b.id
    WHERE p.source_url IS NOT NULL AND p.tasting_notes IS NULL
  `);
  let rows = res[0].values.map(([id, brand, product_name, source_url]) => ({ id, brand, product_name, source_url }));

  const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) : {};

  if (RETRY_FAILED) {
    const failedIds = new Set(Object.values(existing).filter((r) => r.status !== "ok").map((r) => r.id));
    rows = rows.filter((p) => failedIds.has(p.id));
    console.log(`RETRY: ${rows.length} previously-failed products`);
  } else {
    rows = rows.filter((p) => !existing[p.id] || existing[p.id].status !== "ok");
    console.log(`${rows.length} products missing taste data to scrape`);
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

  for (const r of results) existing[r.id] = r;
  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));

  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("\n=== Summary ===");
  for (const [status, count] of Object.entries(byStatus)) console.log(`  ${status}: ${count}`);
  console.log(`\nWrote ${OUT_PATH} (${Object.keys(existing).length} products total)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
