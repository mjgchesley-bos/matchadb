import { getDb, EXCLUDE_NOVELTY_FORMATS_SQL, type ProductRow } from "./db";
import { brandsNotShippingTo, type ShipRegion } from "./shipping";
import { getBrandRecognitionScore } from "./brand-recognition";

// Data behind the /guides pages. A guide is a saved question ("matcha under
// $20", "matcha for lattes") answered from the same product table as /browse,
// so every number on a guide page is recomputed from the database at build.
//
// Guides compare plain matcha powders. The catalog also holds flavored blends,
// tea bags, sweetened latte mixes, sample sachets and products with no
// verified price; those are left out here because they would distort price per
// gram and bury the powders people are comparing. The name filter is a
// conservative keyword list, so a few edge cases may slip through either way.
export const GUIDE_MIN_GRAMS = 20;

const BLEND_TERMS = [
  "earl grey", "black tea", "genmai", "hibiscus", "mint", "rooibos", "white rhino", "flavored",
  "vanilla", "cocoa", "chocolate", "mocha", "yuzu", "sakura", "blueberry", "pomegranate", "banana",
  "cherry", "cinnamon", "coffee", "lime", "lemonade", "maple", "peach", "pistachio", "colada",
  "strawberry", "watermelon", "turmeric", "berry", "lavender", "collagen", "reishi", "tea bag",
  "sencha", "soba", "sweet matcha", "booster", "latte powder", "drink mix", "rose latt", "sampler",
  "comparison set", "roasted", "hojicha", "matcha latte", "milky",
];

const PURE_MATCHA_SQL = [
  "p.not_found = 0",
  EXCLUDE_NOVELTY_FORMATS_SQL,
  ...BLEND_TERMS.map((t) => `p.product_name NOT LIKE '%${t}%'`),
  // A price reconstructed without reading the live page (page unreachable) is not
  // trustworthy enough to rank on price per gram.
  "(p.page_notes IS NULL OR (p.page_notes NOT LIKE '%could not be directly fetched%' AND p.page_notes NOT LIKE '%search-engine synthesis%'))",
  "p.price_usd IS NOT NULL",
  "p.price_per_gram IS NOT NULL",
  "p.price_needs_review = 0",
  `p.price_size_grams >= ${GUIDE_MIN_GRAMS}`,
].join(" AND ");

export type GuideSpec = {
  grades?: string[];
  // Grades to leave out (products with no grade stay in).
  excludeGrades?: string[];
  uses?: string[];
  organicOnly?: boolean;
  maxPrice?: number;
  // Price per gram bounds: exclusive lower, inclusive upper.
  minPerGram?: number;
  maxPerGram?: number;
};

export async function getGuideRows(spec: GuideSpec, shipsTo: ShipRegion | undefined = "US"): Promise<ProductRow[]> {
  const db = await getDb();
  const where: string[] = [PURE_MATCHA_SQL];
  const params: (string | number)[] = [];

  if (spec.grades?.length) {
    where.push(`p.grade IN (${spec.grades.map(() => "?").join(",")})`);
    params.push(...spec.grades);
  }
  if (spec.excludeGrades?.length) {
    where.push(`(p.grade IS NULL OR p.grade NOT IN (${spec.excludeGrades.map(() => "?").join(",")}))`);
    params.push(...spec.excludeGrades);
  }
  if (spec.uses?.length) {
    where.push(`(${spec.uses.map(() => "p.use_tags LIKE ?").join(" OR ")})`);
    params.push(...spec.uses.map((u) => `%"${u}"%`));
  }
  if (spec.organicOnly) where.push("p.organic_certified = 1");
  if (spec.maxPrice != null) {
    where.push("p.price_usd <= ?");
    params.push(spec.maxPrice);
  }
  if (spec.minPerGram != null) {
    where.push("p.price_per_gram > ?");
    params.push(spec.minPerGram);
  }
  if (spec.maxPerGram != null) {
    where.push("p.price_per_gram <= ?");
    params.push(spec.maxPerGram);
  }
  const blocked = shipsTo ? brandsNotShippingTo(shipsTo) : [];
  if (blocked.length) {
    where.push(`b.name NOT IN (${blocked.map(() => "?").join(",")})`);
    params.push(...blocked);
  }

  const res = db.exec(
    `SELECT p.id, p.brand_id, b.name as brand_name, p.product_name, p.price_usd, p.price_per_gram,
            p.price_size_grams, p.price_native, p.price_currency, p.price_needs_review,
            p.price_review_reason, p.fx_converted, p.fx_rate_date,
            p.grade, p.cultivar, p.region, p.organic_certified, p.source_url,
            p.has_contradictions, p.not_found, p.page_notes, p.price_link_only,
            p.tasting_notes, p.flavor_tags, p.use_tags
     FROM products p
     JOIN brands b ON p.brand_id = b.id
     WHERE ${where.join(" AND ")}`,
    params
  );
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj as ProductRow;
  });
}

export type Summary = {
  count: number;
  brands: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
};

function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarize(rows: ProductRow[]): Summary {
  const ppg = rows.map((r) => r.price_per_gram as number).sort((a, b) => a - b);
  return {
    count: rows.length,
    brands: new Set(rows.map((r) => r.brand_name)).size,
    median: quantile(ppg, 0.5),
    p25: quantile(ppg, 0.25),
    p75: quantile(ppg, 0.75),
    min: ppg[0] ?? null,
    max: ppg[ppg.length - 1] ?? null,
  };
}

export type Group = Summary & { name: string };

// Groups with fewer than `minCount` products are dropped: a median of two
// products says nothing.
export function groupBy(rows: ProductRow[], key: "grade" | "region", minCount = 3): Group[] {
  const buckets = new Map<string, ProductRow[]>();
  for (const r of rows) {
    const value = r[key];
    if (value == null) {
      if (key === "region") continue;
      (buckets.get("Not stated") ?? buckets.set("Not stated", []).get("Not stated")!).push(r);
      continue;
    }
    (buckets.get(value) ?? buckets.set(value, []).get(value)!).push(r);
  }
  return [...buckets.entries()]
    .map(([name, rs]) => ({ name, ...summarize(rs) }))
    .filter((g) => g.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

// "recognition": one product per brand at a time, best-known brands first, so
// the list shows variety instead of one brand's whole catalog.
// "perGram": the lowest price per gram, capped at two per brand for the same reason.
export function pickProducts(rows: ProductRow[], limit: number, sort: "recognition" | "perGram" = "recognition"): ProductRow[] {
  const complete = (r: ProductRow) => (r.grade && r.region && r.flavor_tags !== "[]" ? 1 : 0);
  if (sort === "perGram") {
    const perBrand = new Map<string, number>();
    const out: ProductRow[] = [];
    for (const r of [...rows].sort((a, b) => (a.price_per_gram as number) - (b.price_per_gram as number))) {
      const n = perBrand.get(r.brand_name) ?? 0;
      if (n >= 2) continue;
      perBrand.set(r.brand_name, n + 1);
      out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  }
  const byBrand = new Map<string, ProductRow[]>();
  for (const r of rows) {
    if (!byBrand.has(r.brand_name)) byBrand.set(r.brand_name, []);
    byBrand.get(r.brand_name)!.push(r);
  }
  for (const list of byBrand.values()) {
    list.sort((a, b) => complete(b) - complete(a) || (a.price_per_gram as number) - (b.price_per_gram as number));
  }
  const brands = [...byBrand.keys()].sort((a, b) => getBrandRecognitionScore(b) - getBrandRecognitionScore(a) || a.localeCompare(b));
  const out: ProductRow[] = [];
  for (let round = 0; out.length < limit; round++) {
    let added = false;
    for (const brand of brands) {
      const candidate = byBrand.get(brand)![round];
      if (!candidate) continue;
      out.push(candidate);
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
  }
  return out;
}
