// Pulls the matcha research dataset from S3 and builds a local SQLite file
// (data/matcha.db) via sql.js. Re-run manually whenever the S3 data changes.
//
// Usage: node scripts/build-db.mjs

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { resolveCanonicalPrice, extractPriceVariants, pickCanonicalFromVariants } from "./price-extract.mjs";
import { GRADE_KEYWORDS, CULTIVAR_KEYWORDS, REGION_KEYWORDS, findFirstKeyword } from "./attribute-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET || "matcha-product-database";
const OUT_PATH = path.join(__dirname, "..", "data", "matcha.db");
const FX_RATE_PATH = path.join(__dirname, "..", "data", "fx-rate.json");
const REMOVED_PATH = path.join(__dirname, "..", "data", "removed-products.json");
const LIVE_PRICES_PATH = path.join(__dirname, "..", "data", "live-prices.json");
const PRICE_LINK_ONLY_PATH = path.join(__dirname, "..", "data", "price-display-overrides.json");
const RESOLVED_CONTRADICTIONS_PATH = path.join(__dirname, "..", "data", "resolved-contradictions.json");
const LIVE_ATTRIBUTES_PATH = path.join(__dirname, "..", "data", "live-attributes.json");
const SECONDARY_LINKS_PATH = path.join(__dirname, "..", "data", "secondary-source-brand-links.json");

const s3 = new S3Client({ region: REGION });
const fxRate = JSON.parse(fs.readFileSync(FX_RATE_PATH, "utf-8"));
const removedProducts = JSON.parse(fs.readFileSync(REMOVED_PATH, "utf-8"));
const removedSet = new Set(removedProducts.map((r) => `${r.brand}||${r.product}`));
const priceLinkOnlyProducts = JSON.parse(fs.readFileSync(PRICE_LINK_ONLY_PATH, "utf-8"));
const priceLinkOnlySet = new Set(priceLinkOnlyProducts.map((r) => `${r.brand}||${r.product}`));

// Specific archived contradictions that live-scraping has since resolved
// (e.g. a price whose size "couldn't be confirmed" in the archived research,
// now confirmed directly from the current product page) -- curated rather
// than auto-detected, since telling "resolved" apart from "still a real
// inconsistency" requires a human to actually look.
const resolvedContradictions = JSON.parse(fs.readFileSync(RESOLVED_CONTRADICTIONS_PATH, "utf-8"));
const resolvedContradictionsByKey = new Map();
for (const r of resolvedContradictions) {
  const key = `${r.brand}||${r.product}`;
  if (!resolvedContradictionsByKey.has(key)) resolvedContradictionsByKey.set(key, []);
  resolvedContradictionsByKey.get(key).push(r.matchSubstring);
}

// Live-scraped pricing (scripts/scrape-live-prices.mjs) is the authoritative
// source when available -- real, complete, CURRENT variant data straight
// from the product page, superseding whatever the archived research JSON
// happened to capture (which is often incomplete and can be stale; see the
// Breakaway Matcha and Matcha Outlet cases that motivated building this).
const livePricesRaw = fs.existsSync(LIVE_PRICES_PATH) ? JSON.parse(fs.readFileSync(LIVE_PRICES_PATH, "utf-8")) : {};
const livePricesByKey = new Map();
for (const entry of Object.values(livePricesRaw)) {
  if (entry.status !== "ok") continue;
  livePricesByKey.set(`${entry.brand}||${entry.product_name}`, entry);
}

// Live-scraped grade/cultivar/region (scripts/scrape-live-attributes.mjs) --
// same rationale as live pricing: the archived research text is a point-in-
// time snapshot and often simply never captured a field the current page
// states plainly. Only fills in a gap the archived-text extraction left
// null; never overrides an archived-text match.
const liveAttributesRaw = fs.existsSync(LIVE_ATTRIBUTES_PATH)
  ? JSON.parse(fs.readFileSync(LIVE_ATTRIBUTES_PATH, "utf-8"))
  : {};
const liveAttributesByKey = new Map();
for (const entry of Object.values(liveAttributesRaw)) {
  if (entry.status !== "ok") continue;
  liveAttributesByKey.set(`${entry.brand}||${entry.product_name}`, entry);
}

// Curated brand links for secondary-source findings (lab reports, reviews,
// safety incidents) whose matched_brand came back blank in the archived
// research even though the finding's own text names a brand we do have --
// e.g. a Minimalist Baker review whose "notes" field literally says
// "Product: Matcha Moon Ceremonial Grade Matcha," annotated at research
// time as "not in database" because the brand catalog was smaller then.
// Verified individually against the current brands table before adding --
// not auto-detected, since a naive brand-name substring match produces real
// false positives (e.g. a brand named "Tradition" matching inside the word
// "traditional").
const secondaryLinks = JSON.parse(fs.readFileSync(SECONDARY_LINKS_PATH, "utf-8"));

async function getS3Json(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body.transformToString("utf-8");
  return JSON.parse(body);
}

// ---- best-effort structured-field extraction from the free-form "disclosed" object ----
// GRADE_KEYWORDS / CULTIVAR_KEYWORDS / REGION_KEYWORDS / findFirstKeyword
// now live in attribute-extract.mjs, shared with scrape-live-attributes.mjs.

function flattenToText(value, acc = []) {
  if (value == null) return acc;
  if (typeof value === "string") {
    acc.push(value);
  } else if (typeof value === "number" || typeof value === "boolean") {
    acc.push(String(value));
  } else if (Array.isArray(value)) {
    for (const v of value) flattenToText(v, acc);
  } else if (typeof value === "object") {
    for (const k of Object.keys(value)) {
      acc.push(k);
      flattenToText(value[k], acc);
    }
  }
  return acc;
}

// Converts a native-currency amount to USD using the pinned fx-rate.json
// snapshot. Returns usd: null / converted: 0 for USD itself (nothing to
// convert) or an unrecognized currency.
function convertToUsd(amount, currency) {
  if (amount == null) return { usd: null, converted: 0 };
  if (currency === "USD") return { usd: amount, converted: 0 };
  if (currency === "JPY") return { usd: Math.round((amount / fxRate.usdToJpy) * 100) / 100, converted: 1 };
  if (currency === "GBP") return { usd: Math.round(amount * fxRate.gbpToUsd * 100) / 100, converted: 1 };
  if (currency === "EUR") return { usd: Math.round(amount * fxRate.eurToUsd * 100) / 100, converted: 1 };
  return { usd: null, converted: 0 };
}

function extractStructuredFields(disclosed, contradictionsText, liveVariants, liveAttributes, productName) {
  const textParts = flattenToText(disclosed);
  const text = textParts.join(" | ");
  const lower = text.toLowerCase();
  const nameLower = (productName || "").toLowerCase();

  // Priority: the product's own name (highest confidence, zero risk, no
  // fetch needed -- e.g. "Ceremonial Vanilla Matcha" already says its grade)
  // > archived research text > live-scraped page text (only fills a gap the
  // first two left null; never overrides either).
  const grade = findFirstKeyword(nameLower, GRADE_KEYWORDS) || findFirstKeyword(lower, GRADE_KEYWORDS) || liveAttributes?.grade || null;
  const cultivar = findFirstKeyword(nameLower, CULTIVAR_KEYWORDS) || findFirstKeyword(lower, CULTIVAR_KEYWORDS) || liveAttributes?.cultivar || null;
  const region = findFirstKeyword(nameLower, REGION_KEYWORDS) || findFirstKeyword(lower, REGION_KEYWORDS) || liveAttributes?.region || null;
  // avoid the "conventional, not organic" false-positive: only count it as
  // organic if "organic" appears without a negation word shortly before it
  const organicCertified = /\borganic\b/i.test(text) && !/\b(not|non)[\s-]?organic\b/i.test(text) ? 1 : 0;

  // Live-scraped variants are real, confirmed, current data -- no
  // clustering/disambiguation needed, and no review flag, unlike prices
  // reconstructed from free-form research text.
  const price =
    liveVariants && liveVariants.length > 0
      ? { ...pickCanonicalFromVariants(liveVariants), needsReview: false, reviewReason: null }
      : resolveCanonicalPrice(disclosed, contradictionsText || "");
  let priceUsd = price.priceUsd;
  let fxConverted = 0;
  let fxRateDate = null;
  if (priceUsd == null && price.priceNative != null) {
    const converted = convertToUsd(price.priceNative, price.priceCurrency);
    priceUsd = converted.usd;
    fxConverted = converted.converted;
    fxRateDate = converted.converted ? fxRate.asOf : null;
  }

  return {
    grade: grade ? grade[0].toUpperCase() + grade.slice(1) : null,
    cultivar: cultivar ? cultivar[0].toUpperCase() + cultivar.slice(1) : null,
    region: region ? region[0].toUpperCase() + region.slice(1) : null,
    organicCertified,
    priceUsd,
    pricePerGram: price.pricePerGram,
    priceSizeGrams: price.priceSizeGrams,
    priceNative: price.priceNative,
    priceCurrency: price.priceCurrency,
    priceNeedsReview: price.needsReview ? 1 : 0,
    priceReviewReason: price.reviewReason,
    fxConverted,
    fxRateDate,
  };
}

async function main() {
  console.log(`Pulling data from s3://${BUCKET} ...`);
  const [products, secondary] = await Promise.all([
    getS3Json("matcha_product_data_full.json"),
    getS3Json("matcha_secondary_data_full.json"),
  ]);
  console.log(`  matcha_product_data_full.json: ${products.length} records`);
  console.log(`  matcha_secondary_data_full.json: ${secondary.length} records`);

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE brands (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      brand_id INTEGER REFERENCES brands(id),
      product_name TEXT NOT NULL,
      price_usd REAL,
      price_per_gram REAL,
      price_size_grams REAL,
      price_native REAL,
      price_currency TEXT,
      price_needs_review INTEGER DEFAULT 0,
      price_review_reason TEXT,
      fx_converted INTEGER DEFAULT 0,
      fx_rate_date TEXT,
      grade TEXT,
      cultivar TEXT,
      region TEXT,
      organic_certified INTEGER DEFAULT 0,
      source_url TEXT,
      has_contradictions INTEGER DEFAULT 0,
      not_found INTEGER DEFAULT 0,
      disclosed_json TEXT,
      page_notes TEXT,
      -- A real price is confirmed to exist, but the packaging format (stick
      -- counts, tea-bag counts, bag-count multipliers) doesn't map to a
      -- comparable per-gram figure -- curated in data/price-display-overrides.json
      -- rather than auto-detected. Site shows "Pricing available on product
      -- page" instead of a computed number for these, never "no data".
      price_link_only INTEGER DEFAULT 0,
      UNIQUE(brand_id, product_name)
    );

    CREATE TABLE secondary_sources (
      id INTEGER PRIMARY KEY,
      product_id INTEGER REFERENCES products(id),
      brand_id INTEGER REFERENCES brands(id),
      source_type TEXT,
      source_name TEXT,
      source_url TEXT,
      finding_json TEXT
    );

    CREATE TABLE contradictions (
      id INTEGER PRIMARY KEY,
      product_id INTEGER REFERENCES products(id),
      contradiction_text TEXT
    );

    -- Every distinct size/price offering actually disclosed for a product,
    -- not just the smallest ("canonical") one stored on products itself.
    -- price_usd/all_amounts_json is null/populated only when a size had
    -- multiple genuinely different listed prices with no way to tell which
    -- is current (e.g. two different-looking listings) -- shown as-is
    -- rather than guessed.
    CREATE TABLE product_prices (
      id INTEGER PRIMARY KEY,
      product_id INTEGER REFERENCES products(id),
      size_grams REAL,
      price_native REAL,
      price_currency TEXT,
      price_usd REAL,
      fx_converted INTEGER DEFAULT 0,
      fx_rate_date TEXT,
      needs_review INTEGER DEFAULT 0,
      all_amounts_json TEXT,
      inferred INTEGER DEFAULT 0
    );

    CREATE INDEX idx_products_brand ON products(brand_id);
    CREATE INDEX idx_products_grade ON products(grade);
    CREATE INDEX idx_products_region ON products(region);
    CREATE INDEX idx_secondary_product ON secondary_sources(product_id);
    CREATE INDEX idx_secondary_brand ON secondary_sources(brand_id);
    CREATE INDEX idx_contradictions_product ON contradictions(product_id);
    CREATE INDEX idx_product_prices_product ON product_prices(product_id);
  `);

  const brandIds = new Map();
  function getBrandId(name) {
    if (brandIds.has(name)) return brandIds.get(name);
    db.run("INSERT INTO brands (name) VALUES (?)", [name]);
    const id = db.exec("SELECT last_insert_rowid() AS id")[0].values[0][0];
    brandIds.set(name, id);
    return id;
  }

  const productIds = new Map(); // "brand||product" -> id
  let contradictionRows = 0;
  let priceVariantRows = 0;

  let removedCount = 0;
  let liveDataCount = 0;
  let liveAttributesCount = 0;
  for (const p of products) {
    const brand = (p.brand || "").trim();
    const product = (p.product || "").trim();
    if (!brand || !product) continue;
    if (removedSet.has(`${brand}||${product}`)) {
      removedCount++;
      continue;
    }

    const brandId = getBrandId(brand);
    const disclosed = p.disclosed || {};
    const resolvedSubstrings = resolvedContradictionsByKey.get(`${brand}||${product}`) || [];
    const contradictions = (p.contradictions || []).filter(
      (c) => !resolvedSubstrings.some((sub) => c.includes(sub))
    );
    const hasContradictions = contradictions.length > 0 ? 1 : 0;
    const contradictionsText = hasContradictions ? contradictions.join(" || ") : "";

    const isLinkOnly = priceLinkOnlySet.has(`${brand}||${product}`);

    const liveEntry = livePricesByKey.get(`${brand}||${product}`);
    // Keep any variant with a real price even if its size never parsed to
    // grams -- pickCanonicalFromVariants still uses these (to show a price
    // without a size, rather than nothing) as long as every priced variant
    // agrees on one price. Normalize to null (not just an empty array) when
    // there's nothing usable at all (e.g. a product name with no weight in
    // it, like Palais des Thés) -- an empty array is truthy, and without
    // this both downstream consumers would treat "found live data but
    // couldn't use any of it" as "use live data: none", silently producing
    // zero price rows instead of correctly falling back to the
    // archived-data path.
    let liveVariants = liveEntry
      ? liveEntry.variants
          .filter((v) => v.priceNative != null)
          .map((v) => ({ grams: v.grams, priceCurrency: v.currency, priceNative: v.priceNative }))
      : null;
    if (liveVariants && liveVariants.length === 0) liveVariants = null;
    if (liveVariants) liveDataCount++;

    const liveAttrEntry = liveAttributesByKey.get(`${brand}||${product}`);
    if (liveAttrEntry) liveAttributesCount++;

    const fields = extractStructuredFields(disclosed, contradictionsText, liveVariants, liveAttrEntry, product);
    // A price_link_only product deliberately shows no computed per-gram
    // figure and no per-size table, regardless of what the archived data or
    // live scrape found -- the flag must win outright, not just apply when
    // nothing else happened to resolve a number (see Aiya's To Go Sticks,
    // which briefly showed both the "see pricing on page" badge AND a
    // confusing leftover price row from the archived-data fallback).
    if (isLinkOnly) {
      fields.priceUsd = null;
      fields.pricePerGram = null;
      fields.priceSizeGrams = null;
      fields.priceNative = null;
      fields.priceCurrency = null;
      fields.priceNeedsReview = 0;
      fields.priceReviewReason = null;
    }
    const notFound = p.source_url ? 0 : 1;

    db.run(
      `INSERT OR IGNORE INTO products
        (brand_id, product_name, price_usd, price_per_gram, price_size_grams, price_native,
         price_currency, price_needs_review, price_review_reason, fx_converted, fx_rate_date,
         grade, cultivar, region, organic_certified, source_url, has_contradictions, not_found,
         disclosed_json, page_notes, price_link_only)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        brandId,
        product,
        fields.priceUsd,
        fields.pricePerGram,
        fields.priceSizeGrams,
        fields.priceNative,
        fields.priceCurrency,
        fields.priceNeedsReview,
        fields.priceReviewReason,
        fields.fxConverted,
        fields.fxRateDate,
        fields.grade,
        fields.cultivar,
        fields.region,
        fields.organicCertified,
        p.source_url || null,
        hasContradictions,
        notFound,
        JSON.stringify(disclosed),
        p.page_notes || null,
        isLinkOnly ? 1 : 0,
      ]
    );

    const idRes = db.exec("SELECT last_insert_rowid() AS id");
    const productId = idRes[0].values[0][0];
    productIds.set(`${brand}||${product}`, productId);

    if (hasContradictions) {
      for (const c of contradictions) {
        db.run("INSERT INTO contradictions (product_id, contradiction_text) VALUES (?, ?)", [
          productId,
          c,
        ]);
        contradictionRows++;
      }
    }

    // Live-scraped variants (real, complete, current) replace the
    // archived-data-derived ones entirely when available -- see the
    // liveVariants computation above. price_link_only products show no
    // per-size table at all (see the isLinkOnly note above fields). Variants
    // with no size (grams == null) are excluded from this per-size table --
    // there's nothing to list a "size" as -- but still feed the canonical
    // price via extractStructuredFields above (a price shown with no size).
    const priceVariants = isLinkOnly
      ? []
      : liveVariants
      ? liveVariants
          .filter((v) => v.grams != null)
          .map((v) => ({
            grams: v.grams,
            priceCurrency: v.priceCurrency,
            priceNative: v.priceNative,
            allAmounts: [v.priceNative],
            needsReview: false,
            inferred: false,
          }))
      : extractPriceVariants(disclosed);

    for (const variant of priceVariants) {
      const converted = convertToUsd(variant.priceNative, variant.priceCurrency);
      db.run(
        `INSERT INTO product_prices
          (product_id, size_grams, price_native, price_currency, price_usd, fx_converted, fx_rate_date,
           needs_review, all_amounts_json, inferred)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          variant.grams,
          variant.priceNative,
          variant.priceCurrency,
          converted.usd,
          converted.converted,
          converted.converted ? fxRate.asOf : null,
          variant.needsReview ? 1 : 0,
          JSON.stringify(variant.allAmounts),
          variant.inferred ? 1 : 0,
        ]
      );
      priceVariantRows++;
    }
  }

  let secondaryRows = 0;
  for (const s of secondary) {
    let brand = s.matched_brand || null;
    const product = s.matched_product || null;
    let brandId = null;
    let productId = null;
    if (brand) {
      brandId = brandIds.get(brand) || null;
      if (product) {
        productId = productIds.get(`${brand}||${product}`) || null;
      }
    }
    if (!brandId) {
      const findingText = JSON.stringify(s.finding || {});
      const link = secondaryLinks.find((l) => l.source_url === s.source_url && findingText.includes(l.matchSubstring));
      if (link) {
        brand = link.brand;
        brandId = brandIds.get(brand) || null;
      }
    }
    // only keep findings that are actually linked to a brand in our database
    if (!brandId) continue;

    db.run(
      `INSERT INTO secondary_sources (product_id, brand_id, source_type, source_name, source_url, finding_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productId,
        brandId,
        s.source_type || null,
        s.source_name || null,
        s.source_url || null,
        JSON.stringify(s.finding || {}),
      ]
    );
    secondaryRows++;
  }

  const brandCount = db.exec("SELECT COUNT(*) FROM brands")[0].values[0][0];
  const productCount = db.exec("SELECT COUNT(*) FROM products")[0].values[0][0];
  const priceResolvedCount = db.exec("SELECT COUNT(*) FROM products WHERE price_usd IS NOT NULL AND price_needs_review = 0")[0].values[0][0];
  const priceReviewCount = db.exec("SELECT COUNT(*) FROM products WHERE price_needs_review = 1")[0].values[0][0];
  const fxConvertedCount = db.exec("SELECT COUNT(*) FROM products WHERE fx_converted = 1")[0].values[0][0];
  const gradeMissing = db.exec("SELECT COUNT(*) FROM products WHERE grade IS NULL")[0].values[0][0];
  const cultivarMissing = db.exec("SELECT COUNT(*) FROM products WHERE cultivar IS NULL")[0].values[0][0];
  const regionMissing = db.exec("SELECT COUNT(*) FROM products WHERE region IS NULL")[0].values[0][0];

  console.log(`\nBuilt database:`);
  console.log(`  excluded as removed/discontinued (404): ${removedCount}`);
  console.log(`  brands: ${brandCount}`);
  console.log(`  products: ${productCount}`);
  console.log(`  contradiction rows: ${contradictionRows}`);
  console.log(`  price variant rows (all disclosed sizes): ${priceVariantRows}`);
  console.log(`  products using live-scraped pricing: ${liveDataCount}`);
  console.log(`  products with a live-scraped grade/cultivar/region fallback available: ${liveAttributesCount}`);
  console.log(`  price-link-only (real price, non-comparable format): ${priceLinkOnlySet.size}`);
  console.log(`  secondary_source rows linked to a database brand: ${secondaryRows} (of ${secondary.length} total findings)`);
  console.log(`  prices cleanly resolved: ${priceResolvedCount}`);
  console.log(`  prices needing human review: ${priceReviewCount}`);
  console.log(`  prices converted from JPY (rate as of ${fxRate.asOf}): ${fxConvertedCount}`);
  console.log(`  missing grade / cultivar / region: ${gradeMissing} / ${cultivarMissing} / ${regionMissing}`);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const data = db.export();
  fs.writeFileSync(OUT_PATH, Buffer.from(data));
  console.log(`\nWrote ${OUT_PATH} (${(data.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
