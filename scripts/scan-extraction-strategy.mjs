// Scans every source domain to determine which price-extraction strategy
// applies: Shopify's embedded "var meta" variants JSON (exact, complete,
// no clicking needed), a different Shopify JSON location, JSON-LD, or
// neither (needs browser-based interaction or manual handling).
//
// Deliberately slow and polite: low concurrency, per-domain delay, retries
// with backoff on 429/challenge responses. A bot-detection block must NEVER
// be recorded as "pattern not found" -- that's a false "no data" exactly
// like the trap this script exists to avoid.

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "extraction-strategy-scan.json");

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
      const blocked = res.status === 429 || res.status === 403 || res.status === 503 || CHALLENGE_RE.test(html.slice(0, 2000));
      if (blocked) {
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
          continue;
        }
        return { blocked: true, status: res.status };
      }
      return { blocked: false, status: res.status, html };
    } catch (err) {
      if (i === attempts - 1) return { error: String(err.message || err) };
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

function classify(html) {
  const hasVarMeta = /var\s+meta\s*=\s*\{[\s\S]*?"variants"/.test(html);
  const hasProductJsonTag = /<script[^>]*id="ProductJson[^"]*"[^>]*>/.test(html);
  const hasShopifyMarker = /cdn\.shopify\.com|Shopify\.theme|shopify-features|window\.Shopify\s*=/.test(html);
  const hasJsonLdProduct = /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]{0,3000}?"@type"\s*:\s*"Product"/i.test(
    html
  );
  return { hasVarMeta, hasProductJsonTag, hasShopifyMarker, hasJsonLdProduct };
}

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(path.join(__dirname, "..", "data", "matcha.db"));
  const db = new SQL.Database(buf);
  const res = db.exec("SELECT source_url FROM products WHERE source_url IS NOT NULL");
  const urls = res[0].values.map((v) => v[0]);

  const byDomain = new Map();
  for (const u of urls) {
    try {
      const domain = new URL(u).hostname.replace(/^www\./, "");
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push(u);
    } catch {}
  }
  const domains = [...byDomain.keys()];
  console.log(`Scanning ${domains.length} domains (serial, polite pacing)...`);

  const results = [];
  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    const url = byDomain.get(domain)[0];
    const count = byDomain.get(domain).length;
    const r = await fetchWithRetry(url);
    if (r.error) {
      results.push({ domain, count, url, status: "error", detail: r.error });
    } else if (r.blocked) {
      results.push({ domain, count, url, status: "blocked", httpStatus: r.status });
    } else {
      const c = classify(r.html);
      let strategy = "none_found";
      if (c.hasVarMeta) strategy = "shopify_var_meta";
      else if (c.hasProductJsonTag) strategy = "shopify_product_json_tag";
      else if (c.hasShopifyMarker) strategy = "shopify_other";
      else if (c.hasJsonLdProduct) strategy = "json_ld";
      results.push({ domain, count, url, status: "ok", httpStatus: r.status, strategy, ...c });
    }
    console.log(`  [${i + 1}/${domains.length}] ${domain} (${count}) -> ${results[i].status === "ok" ? results[i].strategy : results[i].status}`);
    await new Promise((r) => setTimeout(r, 600));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

  const sum = (arr) => arr.reduce((s, r) => s + r.count, 0);
  const byStrategy = {};
  for (const r of results) {
    const key = r.status === "ok" ? r.strategy : r.status;
    (byStrategy[key] ||= []).push(r);
  }
  console.log("\n=== Summary ===");
  for (const [key, arr] of Object.entries(byStrategy)) {
    console.log(`${key}: ${arr.length} domains, ${sum(arr)} products`);
  }
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
