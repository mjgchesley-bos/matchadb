// Re-scrapes CURRENT, COMPLETE per-size pricing directly from live product
// pages -- the archived research JSON only ever captured whichever single
// variant happened to be showing at research time, which both undercounts
// (misses other sizes entirely) and goes stale (prices drift over time).
//
// Runs against ONE strategy segment at a time (--strategy=shopify_var_meta,
// json_ld, ...), reading segment membership from
// data/extraction-strategy-scan.json (see scripts/scan-extraction-strategy.mjs).
// Results accumulate in data/live-prices.json, keyed by product id, so
// running additional segments never clobbers earlier ones.
//
// Deliberately conservative about failure: a blocked/challenged fetch is
// recorded as "blocked", never silently merged with "no variants found" --
// those need a retry or a different strategy, not a false "no data" claim.
//
// Usage: node scripts/scrape-live-prices.mjs --strategy=shopify_var_meta

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findWeights } from "./price-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "matcha.db");
const SCAN_PATH = path.join(__dirname, "..", "data", "extraction-strategy-scan.json");
const OUT_PATH = path.join(__dirname, "..", "data", "live-prices.json");

const strategyArg = process.argv.find((a) => a.startsWith("--strategy="));
const STRATEGY = strategyArg ? strategyArg.split("=")[1] : null;
if (!STRATEGY) {
  console.error("Usage: node scripts/scrape-live-prices.mjs --strategy=<shopify_var_meta|json_ld|...>");
  process.exit(1);
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
const CHALLENGE_RE =
  /verifying your connection|just a moment|checking your browser|attention required|access denied|captcha/i;

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

// Extracts the FULL `{...}` object starting at `startIndex` (which must
// point at the opening brace) by tracking brace depth character-by-character,
// skipping over braces that appear inside string literals. A naive non-greedy
// regex like /\{[\s\S]*?\};/ truncates at the FIRST "};" it finds, which can
// sit inside a nested object well before the real end -- caught on David's
// Tea, whose variant objects (automated_discount_percentage, metafields,
// etc.) are large enough to contain an internal "};" the simpler sites
// tested first never hit.
function extractBalancedObject(text, startIndex) {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escaped = false;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === stringChar) {
        inString = false;
      }
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

function extractShopifyVarMeta(html) {
  const start = html.match(/var\s+meta\s*=\s*\{/);
  if (!start) return null;
  const braceIndex = start.index + start[0].length - 1;
  const jsonText = extractBalancedObject(html, braceIndex);
  if (!jsonText) return null;
  let meta;
  try {
    meta = JSON.parse(jsonText);
  } catch {
    return null;
  }
  const variants = meta?.product?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;

  const currMatch = html.match(/Shopify\.currency\s*=\s*\{"active":"([A-Z]{3})"/);
  const currency = currMatch ? currMatch[1] : "USD";

  return variants
    .filter((v) => typeof v.price === "number")
    .map((v) => ({
      label: v.public_title || v.name || "",
      priceNative: v.price / 100,
      currency,
    }));
}

function extractJsonLd(html) {
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
    if (!product) continue;
    const offers = Array.isArray(product.offers) ? product.offers : product.offers ? [product.offers] : [];
    if (offers.length === 0) continue;
    return offers
      .map((o) => {
        const spec = Array.isArray(o.priceSpecification) ? o.priceSpecification[0] : o.priceSpecification;
        const priceNative = parseFloat(o.price ?? spec?.price);
        const currency = o.priceCurrency ?? spec?.priceCurrency ?? "USD";
        if (!Number.isFinite(priceNative)) return null;
        return { label: product.name || "", priceNative, currency };
      })
      .filter(Boolean);
  }
  return null;
}

function gramsFromLabel(label) {
  const weights = findWeights(label);
  if (weights.length === 0) return null;
  const native = weights.find((w) => w.isNativeGram);
  return (native || weights[0]).grams;
}

async function scrapeOne(product) {
  const res = await fetchWithRetry(product.source_url, RETRY_FAILED ? 4 : 3);
  if (res?.blocked) return { ...product, status: "blocked", httpStatus: res.status };
  if (res?.error) return { ...product, status: "fetch_error", detail: res.error };
  if (!res?.ok) return { ...product, status: "fetch_failed" };

  const rawVariants = STRATEGY === "json_ld" ? extractJsonLd(res.html) : extractShopifyVarMeta(res.html);
  if (!rawVariants || rawVariants.length === 0) {
    return { ...product, status: "no_variants_found", httpStatus: res.status };
  }

  const variants = rawVariants.map((v) => ({
    label: v.label,
    grams: gramsFromLabel(v.label),
    priceNative: v.priceNative,
    currency: v.currency,
  }));

  return { ...product, status: "ok", method: STRATEGY, scrapedAt: new Date().toISOString(), variants };
}

const RETRY_FAILED = process.argv.includes("--retry-failed");

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const scan = JSON.parse(fs.readFileSync(SCAN_PATH, "utf-8"));
  const domainsInSegment = new Set(scan.filter((r) => r.strategy === STRATEGY).map((r) => r.domain));

  const res = db.exec(`
    SELECT p.id, b.name, p.product_name, p.source_url
    FROM products p JOIN brands b ON p.brand_id = b.id
    WHERE p.source_url IS NOT NULL
  `);
  let rows = res[0].values
    .map(([id, brand, product_name, source_url]) => ({ id, brand, product_name, source_url }))
    .filter((p) => {
      try {
        return domainsInSegment.has(new URL(p.source_url).hostname.replace(/^www\./, ""));
      } catch {
        return false;
      }
    });

  const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) : {};

  if (RETRY_FAILED) {
    const failedIds = new Set(
      Object.values(existing)
        .filter((r) => r.status !== "ok")
        .map((r) => r.id)
    );
    rows = rows.filter((p) => failedIds.has(p.id));
    console.log(`Segment "${STRATEGY}" RETRY: ${rows.length} previously-failed products`);
  } else {
    console.log(`Segment "${STRATEGY}": ${rows.length} products across ${domainsInSegment.size} domains`);
  }

  // Group by domain, process domains in parallel but serialize + delay
  // within each domain so a busy 40-product domain doesn't get hammered.
  // Retry mode is much more conservative: fewer concurrent domains, longer
  // delay between requests -- these are exactly the domains that already
  // proved they rate-limit under the normal pace.
  const byDomain = new Map();
  for (const p of rows) {
    const d = new URL(p.source_url).hostname.replace(/^www\./, "");
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(p);
  }

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

  // Merge into existing live-prices.json, keyed by product id, without
  // clobbering results from other segments already scraped.
  for (const r of results) {
    existing[r.id] = r;
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));

  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("\n=== Segment summary ===");
  for (const [status, count] of Object.entries(byStatus)) console.log(`  ${status}: ${count}`);
  const totalVariants = results.filter((r) => r.status === "ok").reduce((s, r) => s + r.variants.length, 0);
  console.log(`  total variants captured: ${totalVariants}`);
  console.log(`\nWrote ${OUT_PATH} (${Object.keys(existing).length} products total across all segments so far)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
