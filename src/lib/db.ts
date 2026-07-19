import initSqlJs, { type Database } from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { PRICE_TIER_CHEAP_MAX, PRICE_TIER_MID_MAX } from "./price";
import { getExternalLinkInfo } from "./links";

let dbPromise: Promise<Database> | null = null;

async function loadDb(): Promise<Database> {
  const SQL = await initSqlJs({
    // sql.js needs to locate its .wasm file at runtime
    locateFile: (file: string) =>
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });
  const filePath = path.join(process.cwd(), "data", "matcha.db");
  const fileBuffer = fs.readFileSync(filePath);
  return new SQL.Database(fileBuffer);
}

// Cached across requests within the same server process/lambda instance.
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = loadDb();
  }
  return dbPromise;
}

export type ProductPriceRow = {
  id: number;
  product_id: number;
  size_grams: number;
  price_native: number | null;
  price_currency: string;
  price_usd: number | null;
  fx_converted: number;
  fx_rate_date: string | null;
  needs_review: number;
  all_amounts_json: string;
  inferred: number;
};

export type ProductRow = {
  id: number;
  brand_id: number;
  brand_name: string;
  product_name: string;
  price_usd: number | null;
  price_per_gram: number | null;
  price_size_grams: number | null;
  price_native: number | null;
  price_currency: string | null;
  price_needs_review: number;
  price_review_reason: string | null;
  fx_converted: number;
  fx_rate_date: string | null;
  grade: string | null;
  cultivar: string | null;
  region: string | null;
  organic_certified: number;
  source_url: string | null;
  has_contradictions: number;
  not_found: number;
  page_notes: string | null;
  price_link_only: number;
  tasting_notes: string | null;
  flavor_tags: string;
  use_tags: string;
  l_theanine_mg_g: number | null;
  l_theanine_source: string | null;
  l_theanine_note: string | null;
  egcg_mg_g: number | null;
  egcg_source: string | null;
  egcg_note: string | null;
};

function rowsToObjects<T>(result: initSqlJs.QueryExecResult[]): T[] {
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export type BrowseFilters = {
  q?: string;
  brand?: string;
  grades?: string[];
  region?: string;
  flavors?: string[];
  uses?: string[];
  organicOnly?: boolean;
  hasContradictionsOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minTheanine?: number;
  minEgcg?: number;
  page?: number;
  pageSize?: number;
};

function buildWhereClause(filters: BrowseFilters): { where: string[]; params: (string | number)[] } {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.q) {
    where.push("(p.product_name LIKE ? OR b.name LIKE ?)");
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.brand) {
    where.push("b.name = ?");
    params.push(filters.brand);
  }
  if (filters.grades && filters.grades.length > 0) {
    // Checking multiple grades means "any of these" (a product has exactly
    // one grade) -- standard faceted-search convention: OR within a facet,
    // AND across facets.
    where.push(`p.grade IN (${filters.grades.map(() => "?").join(",")})`);
    params.push(...filters.grades);
  }
  if (filters.region) {
    where.push("p.region = ?");
    params.push(filters.region);
  }
  if (filters.flavors && filters.flavors.length > 0) {
    // flavor_tags is a JSON array string, e.g. ["Sweet","Umami"] -- a quoted
    // substring match is exact enough here since tag names are a fixed,
    // known vocabulary with no risk of one tag name containing another.
    // Selecting multiple flavors means "any of these," same OR-within-facet
    // convention as grade.
    where.push(`(${filters.flavors.map(() => "p.flavor_tags LIKE ?").join(" OR ")})`);
    params.push(...filters.flavors.map((f) => `%"${f}"%`));
  }
  if (filters.uses && filters.uses.length > 0) {
    where.push(`(${filters.uses.map(() => "p.use_tags LIKE ?").join(" OR ")})`);
    params.push(...filters.uses.map((u) => `%"${u}"%`));
  }
  if (filters.organicOnly) {
    where.push("p.organic_certified = 1");
  }
  if (filters.hasContradictionsOnly) {
    where.push("p.has_contradictions = 1");
  }
  if (filters.minPrice != null) {
    where.push("p.price_usd >= ?");
    params.push(filters.minPrice);
  }
  if (filters.maxPrice != null) {
    where.push("p.price_usd <= ?");
    params.push(filters.maxPrice);
  }
  if (filters.minTheanine != null) {
    where.push("p.l_theanine_mg_g >= ?");
    params.push(filters.minTheanine);
  }
  if (filters.minEgcg != null) {
    where.push("p.egcg_mg_g >= ?");
    params.push(filters.minEgcg);
  }

  return { where, params };
}

export async function getProducts(filters: BrowseFilters) {
  const db = await getDb();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 24;
  const offset = (page - 1) * pageSize;

  const { where, params } = buildWhereClause(filters);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = db.exec(
    `SELECT COUNT(*) as total FROM products p JOIN brands b ON p.brand_id = b.id ${whereSql}`,
    params
  );
  const total = countRes.length ? (countRes[0].values[0][0] as number) : 0;

  const dataRes = db.exec(
    `SELECT p.id, p.brand_id, b.name as brand_name, p.product_name, p.price_usd, p.price_per_gram,
            p.price_size_grams, p.price_native, p.price_currency, p.price_needs_review,
            p.price_review_reason, p.fx_converted, p.fx_rate_date,
            p.grade, p.cultivar, p.region, p.organic_certified, p.source_url,
            p.has_contradictions, p.not_found, p.page_notes, p.price_link_only,
            p.tasting_notes, p.flavor_tags, p.use_tags,
            p.l_theanine_mg_g, p.l_theanine_source, p.l_theanine_note,
            p.egcg_mg_g, p.egcg_source, p.egcg_note
     FROM products p
     JOIN brands b ON p.brand_id = b.id
     ${whereSql}
     ORDER BY b.name COLLATE NOCASE, p.product_name COLLATE NOCASE
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const products = rowsToObjects<ProductRow>(dataRes);

  return { products, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// One representative product per price tier (cheap/mid/premium) under the
// current filters -- only returned when all three tiers actually have a
// match, per the "present as a match when all 3 are applicable" brief.
// Within a tier, prefers the most completely-documented product (has grade,
// region, and at least one flavor tag) as a tiebreaker, then cheapest.
export async function getTieredPicks(filters: BrowseFilters) {
  const db = await getDb();
  const { where, params } = buildWhereClause(filters);
  const baseWhere = where.length ? `${where.join(" AND ")} AND ` : "";

  const columns = `p.id, p.brand_id, b.name as brand_name, p.product_name, p.price_usd, p.price_per_gram,
            p.price_size_grams, p.price_native, p.price_currency, p.price_needs_review,
            p.price_review_reason, p.fx_converted, p.fx_rate_date,
            p.grade, p.cultivar, p.region, p.organic_certified, p.source_url,
            p.has_contradictions, p.not_found, p.page_notes, p.price_link_only,
            p.tasting_notes, p.flavor_tags, p.use_tags,
            p.l_theanine_mg_g, p.l_theanine_source, p.l_theanine_note,
            p.egcg_mg_g, p.egcg_source, p.egcg_note`;

  function pickForRange(rangeSql: string, rangeParams: number[]) {
    const res = db.exec(
      `SELECT ${columns}
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       WHERE ${baseWhere}${rangeSql}
       ORDER BY
         (p.grade IS NOT NULL AND p.region IS NOT NULL AND p.flavor_tags != '[]') DESC,
         p.price_per_gram ASC
       LIMIT 1`,
      [...params, ...rangeParams]
    );
    const rows = rowsToObjects<ProductRow>(res);
    return rows[0] || null;
  }

  const cheap = pickForRange("p.price_per_gram IS NOT NULL AND p.price_per_gram <= ?", [PRICE_TIER_CHEAP_MAX]);
  const mid = pickForRange(
    "p.price_per_gram IS NOT NULL AND p.price_per_gram > ? AND p.price_per_gram <= ?",
    [PRICE_TIER_CHEAP_MAX, PRICE_TIER_MID_MAX]
  );
  const premium = pickForRange("p.price_per_gram IS NOT NULL AND p.price_per_gram > ?", [PRICE_TIER_MID_MAX]);

  if (!cheap || !mid || !premium) return null;
  return { cheap, mid, premium };
}

export async function getFilterOptions() {
  const db = await getDb();
  const brands = rowsToObjects<{ name: string }>(
    db.exec("SELECT name FROM brands ORDER BY name COLLATE NOCASE")
  ).map((r) => r.name);
  const grades = rowsToObjects<{ grade: string }>(
    db.exec("SELECT DISTINCT grade FROM products WHERE grade IS NOT NULL ORDER BY grade")
  ).map((r) => r.grade);
  const regions = rowsToObjects<{ region: string }>(
    db.exec("SELECT DISTINCT region FROM products WHERE region IS NOT NULL ORDER BY region")
  ).map((r) => r.region);
  const flavorRows = rowsToObjects<{ flavor_tags: string }>(
    db.exec("SELECT flavor_tags FROM products WHERE flavor_tags != '[]'")
  );
  const flavorSet = new Set<string>();
  for (const r of flavorRows) {
    for (const tag of JSON.parse(r.flavor_tags) as string[]) flavorSet.add(tag);
  }
  const flavors = [...flavorSet].sort();
  const useRows = rowsToObjects<{ use_tags: string }>(
    db.exec("SELECT use_tags FROM products WHERE use_tags != '[]'")
  );
  const useSet = new Set<string>();
  for (const r of useRows) {
    for (const tag of JSON.parse(r.use_tags) as string[]) useSet.add(tag);
  }
  const uses = [...useSet].sort();
  return { brands, grades, regions, flavors, uses };
}

export async function getProductById(id: number) {
  const db = await getDb();
  const productRes = db.exec(
    `SELECT p.*, b.name as brand_name
     FROM products p JOIN brands b ON p.brand_id = b.id
     WHERE p.id = ?`,
    [id]
  );
  const products = rowsToObjects<ProductRow & { disclosed_json: string }>(productRes);
  if (products.length === 0) return null;
  const product = products[0];

  const contradictions = rowsToObjects<{ contradiction_text: string }>(
    db.exec("SELECT contradiction_text FROM contradictions WHERE product_id = ?", [id])
  ).map((r) => r.contradiction_text);

  const secondarySources = rowsToObjects<{
    source_type: string;
    source_name: string;
    source_url: string;
    finding_json: string;
  }>(
    db.exec(
      "SELECT source_type, source_name, source_url, finding_json FROM secondary_sources WHERE product_id = ? OR (brand_id = ? AND product_id IS NULL)",
      [id, product.brand_id]
    )
  ).map((r) => ({ ...r, finding: JSON.parse(r.finding_json) }));

  const priceVariants = rowsToObjects<ProductPriceRow>(
    db.exec("SELECT * FROM product_prices WHERE product_id = ? ORDER BY size_grams", [id])
  ).map((r) => ({ ...r, allAmounts: JSON.parse(r.all_amounts_json) as number[] }));

  return {
    ...product,
    disclosed: JSON.parse(product.disclosed_json),
    flavorTags: JSON.parse(product.flavor_tags) as string[],
    useTags: JSON.parse(product.use_tags) as string[],
    contradictions,
    secondarySources,
    priceVariants,
  };
}

export async function getBrandProducts(brandName: string) {
  const db = await getDb();
  const res = db.exec(
    `SELECT p.id, p.brand_id, b.name as brand_name, p.product_name, p.price_usd, p.price_per_gram,
            p.price_size_grams, p.price_native, p.price_currency, p.price_needs_review,
            p.price_review_reason, p.fx_converted, p.fx_rate_date,
            p.grade, p.cultivar, p.region, p.organic_certified, p.source_url,
            p.has_contradictions, p.not_found, p.page_notes, p.price_link_only,
            p.tasting_notes, p.flavor_tags, p.use_tags,
            p.l_theanine_mg_g, p.l_theanine_source, p.l_theanine_note,
            p.egcg_mg_g, p.egcg_source, p.egcg_note
     FROM products p JOIN brands b ON p.brand_id = b.id
     WHERE b.name = ?
     ORDER BY p.product_name COLLATE NOCASE`,
    [brandName]
  );
  return rowsToObjects<ProductRow>(res);
}

export async function getStats() {
  const db = await getDb();
  const brandCount = db.exec("SELECT COUNT(*) FROM brands")[0].values[0][0] as number;
  const productCount = db.exec("SELECT COUNT(*) FROM products")[0].values[0][0] as number;

  const urlRows = rowsToObjects<{ source_url: string }>(
    db.exec("SELECT source_url FROM products WHERE source_url IS NOT NULL")
  );
  const hostnames = new Set<string>();
  for (const r of urlRows) {
    const link = getExternalLinkInfo(r.source_url);
    if (link) hostnames.add(link.hostname);
  }
  const retailerCount = hostnames.size;

  return { brandCount, productCount, retailerCount };
}
