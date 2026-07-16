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
import { resolveCanonicalPrice } from "./price-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET || "matcha-product-database";
const OUT_PATH = path.join(__dirname, "..", "data", "matcha.db");
const FX_RATE_PATH = path.join(__dirname, "..", "data", "fx-rate.json");

const s3 = new S3Client({ region: REGION });
const fxRate = JSON.parse(fs.readFileSync(FX_RATE_PATH, "utf-8"));

async function getS3Json(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body.transformToString("utf-8");
  return JSON.parse(body);
}

// ---- best-effort structured-field extraction from the free-form "disclosed" object ----

const GRADE_KEYWORDS = ["ceremonial", "culinary", "premium", "koicha", "usucha", "latte grade", "food grade"];
const CULTIVAR_KEYWORDS = [
  "yabukita", "samidori", "okumidori", "saemidori", "asahi", "gokou", "gokō", "uji hikari",
  "tsuyuhikari", "kanaya midori", "yutakamidori", "sae akari", "zairai", "narino",
];
const REGION_KEYWORDS = [
  "uji", "nishio", "kagoshima", "shizuoka", "kyoto", "yame", "wazuka", "shirakawa",
  "kyushu", "nara", "kakegawa", "aichi", "miyazaki", "aichi", "china", "taiwan", "korea", "vietnam",
];

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

function findFirstKeyword(haystackLower, keywords) {
  for (const kw of keywords) {
    if (haystackLower.includes(kw)) return kw;
  }
  return null;
}

function extractStructuredFields(disclosed, contradictionsText) {
  const textParts = flattenToText(disclosed);
  const text = textParts.join(" | ");
  const lower = text.toLowerCase();

  const grade = findFirstKeyword(lower, GRADE_KEYWORDS);
  const cultivar = findFirstKeyword(lower, CULTIVAR_KEYWORDS);
  const region = findFirstKeyword(lower, REGION_KEYWORDS);
  // avoid the "conventional, not organic" false-positive: only count it as
  // organic if "organic" appears without a negation word shortly before it
  const organicCertified = /\borganic\b/i.test(text) && !/\b(not|non)[\s-]?organic\b/i.test(text) ? 1 : 0;

  const price = resolveCanonicalPrice(disclosed, contradictionsText || "");
  let priceUsd = price.priceUsd;
  let fxConverted = 0;
  let fxRateDate = null;
  if (priceUsd == null && price.priceNative != null) {
    if (price.priceCurrency === "JPY") {
      priceUsd = Math.round((price.priceNative / fxRate.usdToJpy) * 100) / 100;
      fxConverted = 1;
      fxRateDate = fxRate.asOf;
    } else if (price.priceCurrency === "GBP") {
      priceUsd = Math.round(price.priceNative * fxRate.gbpToUsd * 100) / 100;
      fxConverted = 1;
      fxRateDate = fxRate.asOf;
    }
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

    CREATE INDEX idx_products_brand ON products(brand_id);
    CREATE INDEX idx_products_grade ON products(grade);
    CREATE INDEX idx_products_region ON products(region);
    CREATE INDEX idx_secondary_product ON secondary_sources(product_id);
    CREATE INDEX idx_secondary_brand ON secondary_sources(brand_id);
    CREATE INDEX idx_contradictions_product ON contradictions(product_id);
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

  for (const p of products) {
    const brand = (p.brand || "").trim();
    const product = (p.product || "").trim();
    if (!brand || !product) continue;

    const brandId = getBrandId(brand);
    const disclosed = p.disclosed || {};
    const hasContradictions = p.contradictions && p.contradictions.length > 0 ? 1 : 0;
    const contradictionsText = hasContradictions ? p.contradictions.join(" || ") : "";
    const fields = extractStructuredFields(disclosed, contradictionsText);
    const notFound = p.source_url ? 0 : 1;

    db.run(
      `INSERT OR IGNORE INTO products
        (brand_id, product_name, price_usd, price_per_gram, price_size_grams, price_native,
         price_currency, price_needs_review, price_review_reason, fx_converted, fx_rate_date,
         grade, cultivar, region, organic_certified, source_url, has_contradictions, not_found,
         disclosed_json, page_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );

    const idRes = db.exec("SELECT last_insert_rowid() AS id");
    const productId = idRes[0].values[0][0];
    productIds.set(`${brand}||${product}`, productId);

    if (hasContradictions) {
      for (const c of p.contradictions) {
        db.run("INSERT INTO contradictions (product_id, contradiction_text) VALUES (?, ?)", [
          productId,
          c,
        ]);
        contradictionRows++;
      }
    }
  }

  let secondaryRows = 0;
  for (const s of secondary) {
    const brand = s.matched_brand || null;
    const product = s.matched_product || null;
    let brandId = null;
    let productId = null;
    if (brand) {
      brandId = brandIds.get(brand) || null;
      if (product) {
        productId = productIds.get(`${brand}||${product}`) || null;
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

  console.log(`\nBuilt database:`);
  console.log(`  brands: ${brandCount}`);
  console.log(`  products: ${productCount}`);
  console.log(`  contradiction rows: ${contradictionRows}`);
  console.log(`  secondary_source rows linked to a database brand: ${secondaryRows} (of ${secondary.length} total findings)`);
  console.log(`  prices cleanly resolved: ${priceResolvedCount}`);
  console.log(`  prices needing human review: ${priceReviewCount}`);
  console.log(`  prices converted from JPY (rate as of ${fxRate.asOf}): ${fxConvertedCount}`);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const data = db.export();
  fs.writeFileSync(OUT_PATH, Buffer.from(data));
  console.log(`\nWrote ${OUT_PATH} (${(data.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
