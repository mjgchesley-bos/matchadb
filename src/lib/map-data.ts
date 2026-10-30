import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db";
import { REGION_COORDINATES } from "./regions";
import { REGION_CONTENT } from "./region-content";
import { PLACES } from "./places";
import { FARM_LOCATIONS } from "./farms";
import { getBrandRecognitionScore } from "./brand-recognition";

// Everything the sourcing map's detail panel shows, computed once on the
// server and handed to the client as plain data: one entry per growing region,
// per named district/town, and per verified farm. The map is about where the
// leaf was GROWN, as each brand's own page states it -- never where a brand is
// headquartered -- so nothing here carries a company address.

export type ProductPick = {
  id: number;
  brand: string;
  name: string;
  grade: string | null;
  organic: boolean;
  perGram: number | null;
  priceUsd: number | null;
  grams: number | null;
};

export type MapLocation = {
  id: string;
  kind: "region" | "place" | "farm";
  name: string;
  sub: string;
  lat: number;
  lng: number;
  // Key of a real administrative-boundary file in public/region-boundaries, if one exists.
  boundaryKey: string | null;
  // The region key (e.g. "Uji") used for /browse?region= links.
  regionKey: string | null;
  regionSlug: string | null;
  intro: string | null;
  note: string | null;
  precision: string;
  source: { url: string; label: string } | null;
  products: number;
  brands: number;
  pricedCount: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  organicCount: number;
  grades: { name: string; count: number }[];
  // Counts per grade, and how many of those are organic, so the client can
  // recompute a location's count under any grade/organic filter without a round trip.
  gradeOrganic: Record<string, number>;
  cultivars: { name: string; count: number }[];
  flavors: { tag: string; share: number }[];
  brandCounts: { name: string; count: number }[];
  picks: ProductPick[];
};

type Row = {
  id: number;
  brand: string;
  name: string;
  price_usd: number | null;
  size: number | null;
  needs_review: number;
  link_only: number;
  grade: string | null;
  cultivar: string | null;
  region: string | null;
  organic: number;
  flavors: string;
  disclosed: string | null;
};

// Same origin-text fields getMapBreakdown reads, so a district appears here
// exactly when it appears on the map.
const ORIGIN_FIELDS = [
  "region_farm", "origin_region", "origin", "region_origin", "sourcing_region", "producer", "maker",
  "tea_gardens", "tea_garden", "farm", "farm_region", "farm_location_detail", "origin_region_farm",
  "sourcing", "region", "growing_details", "harvest_info", "origin_claim", "sourcing_details",
  "region_of_origin", "origin_general", "leaf_sourcing_official_site", "farm_location",
];

// Single-serve sticks, sweetened mixes and similar formats: real products, but
// not what a "what does this place grow" list should lead with.
const NOVELTY = /stick|\bpod|packet|sachet|instant|concentrate|\bbite|latte mix|to-go|to go|single[- ]serve|cube|(?<!un)sweetened/i;

function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function perGram(r: Row): number | null {
  if (r.price_usd == null || r.price_usd <= 0 || r.size == null || r.size <= 0) return null;
  if (r.needs_review === 1 || r.link_only === 1) return null;
  return r.price_usd / r.size;
}

function summarize(rows: Row[]) {
  const ppg = rows.map(perGram).filter((n): n is number => n != null).sort((a, b) => a - b);
  const grades = new Map<string, number>();
  const gradeOrganic: Record<string, number> = {};
  const cultivars = new Map<string, number>();
  const flavors = new Map<string, number>();
  const brands = new Map<string, number>();
  let organic = 0;
  let withFlavors = 0;
  for (const r of rows) {
    brands.set(r.brand, (brands.get(r.brand) ?? 0) + 1);
    if (r.organic === 1) organic++;
    const g = r.grade ?? "Not stated";
    grades.set(g, (grades.get(g) ?? 0) + 1);
    if (r.organic === 1) gradeOrganic[g] = (gradeOrganic[g] ?? 0) + 1;
    if (r.cultivar) cultivars.set(r.cultivar, (cultivars.get(r.cultivar) ?? 0) + 1);
    const tags = JSON.parse(r.flavors || "[]") as string[];
    if (tags.length) withFlavors++;
    for (const t of tags) flavors.set(t, (flavors.get(t) ?? 0) + 1);
  }
  const byBrand = new Map<string, Row[]>();
  for (const r of rows) {
    if (NOVELTY.test(r.name) || perGram(r) == null) continue;
    if (!byBrand.has(r.brand)) byBrand.set(r.brand, []);
    byBrand.get(r.brand)!.push(r);
  }
  const order = [...byBrand.keys()].sort((a, b) => getBrandRecognitionScore(b) - getBrandRecognitionScore(a) || a.localeCompare(b));
  const picks: ProductPick[] = [];
  for (let round = 0; picks.length < 8 && round < 4; round++) {
    for (const b of order) {
      const r = byBrand.get(b)![round];
      if (!r) continue;
      picks.push({ id: r.id, brand: r.brand, name: r.name, grade: r.grade, organic: r.organic === 1, perGram: perGram(r), priceUsd: r.price_usd, grams: r.size });
      if (picks.length >= 8) break;
    }
  }
  const list = <T extends { count: number; name: string }>(m: Map<string, number>, n: number): T[] =>
    [...m].map(([name, count]) => ({ name, count }) as T).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, n);
  return {
    products: rows.length,
    brands: brands.size,
    pricedCount: ppg.length,
    median: quantile(ppg, 0.5),
    p25: quantile(ppg, 0.25),
    p75: quantile(ppg, 0.75),
    organicCount: organic,
    grades: list<{ name: string; count: number }>(grades, 8),
    gradeOrganic,
    cultivars: list<{ name: string; count: number }>(cultivars, 6),
    flavors: [...flavors].map(([tag, count]) => ({ tag, share: withFlavors ? count / withFlavors : 0 })).sort((a, b) => b.share - a.share).slice(0, 5),
    brandCounts: [...brands]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || getBrandRecognitionScore(b.name) - getBrandRecognitionScore(a.name) || a.name.localeCompare(b.name)),
    picks,
  };
}

function hasBoundary(key: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "region-boundaries", `${key}.geojson`));
}

let cache: MapLocation[] | null = null;

export async function getMapLocations(): Promise<MapLocation[]> {
  if (cache) return cache;
  const db = await getDb();
  const res = db.exec(
    `SELECT p.id, b.name, p.product_name, p.price_usd, p.price_size_grams, p.price_needs_review, p.price_link_only,
            p.grade, p.cultivar, p.region, p.organic_certified, p.flavor_tags, p.disclosed_json
     FROM products p JOIN brands b ON b.id = p.brand_id
     WHERE p.not_found = 0 AND p.region IS NOT NULL`
  );
  const rows: Row[] = res.length
    ? res[0].values.map((v) => ({
        id: v[0] as number, brand: v[1] as string, name: v[2] as string, price_usd: v[3] as number | null, size: v[4] as number | null,
        needs_review: v[5] as number, link_only: v[6] as number, grade: v[7] as string | null, cultivar: v[8] as string | null,
        region: v[9] as string | null, organic: v[10] as number, flavors: (v[11] as string) ?? "[]", disclosed: v[12] as string | null,
      }))
    : [];

  const out: MapLocation[] = [];

  // Regions
  for (const [key, info] of Object.entries(REGION_COORDINATES)) {
    const rs = rows.filter((r) => r.region === key);
    if (!rs.length) continue;
    const content = REGION_CONTENT[key];
    const boundary = hasBoundary(key);
    out.push({
      id: `region:${key}`,
      kind: "region",
      name: info.name,
      sub: info.country,
      lat: info.lat,
      lng: info.lng,
      boundaryKey: boundary ? key : null,
      regionKey: key,
      regionSlug: content?.slug ?? null,
      intro: content?.intro ?? null,
      note: content?.note ?? null,
      precision: boundary
        ? info.precision === "country"
          ? "The whole country, outlined because it is small enough for that to be informative."
          : "Outlined with the real administrative boundary."
        : info.precision === "country"
          ? "Country-level only: no more specific growing location was disclosed."
          : info.precision === "province"
            ? "Province-level: more specific than a country, not a single farm."
            : "No single boundary exists for this region, so it is shown as a point.",
      source: null,
      ...summarize(rs),
    });
  }

  // Named districts and towns (two or more products)
  const matchers = PLACES.map((pl) => ({ pl, re: new RegExp(`(?<![A-Za-z])(?:${pl.terms.join("|")})(?![a-z])`, "i") }));
  const parsed = rows.map((r) => {
    let text = "";
    if (r.disclosed) {
      try {
        const o = JSON.parse(r.disclosed) as Record<string, unknown>;
        text = ORIGIN_FIELDS.map((f) => (typeof o[f] === "string" ? (o[f] as string) : "")).join(" | ");
      } catch {
        text = "";
      }
    }
    return { r, text };
  });
  for (const { pl, re } of matchers) {
    const rs = parsed.filter(({ r, text }) => r.region != null && pl.regions.includes(r.region) && re.test(text)).map((p) => p.r);
    if (rs.length < 2) continue;
    out.push({
      id: `place:${pl.key}`,
      kind: "place",
      name: pl.name,
      sub: pl.area,
      lat: pl.lat,
      lng: pl.lng,
      boundaryKey: null,
      regionKey: pl.regions[0],
      regionSlug: REGION_CONTENT[pl.regions[0]]?.slug ?? null,
      intro: null,
      note: null,
      precision: "A district or town that brands name on their own product pages. It is a place, not a single farm.",
      source: null,
      ...summarize(rs),
    });
  }

  // Verified farms
  for (const farm of FARM_LOCATIONS) {
    const ids = new Set(farm.productIds);
    const rs = rows.filter((r) => ids.has(r.id));
    if (!rs.length) continue;
    out.push({
      id: `farm:${farm.boundaryKey}`,
      kind: "farm",
      name: farm.name,
      sub: `Supplies ${farm.brand}`,
      lat: farm.lat,
      lng: farm.lng,
      boundaryKey: hasBoundary(farm.boundaryKey) ? farm.boundaryKey : null,
      regionKey: rs[0].region,
      regionSlug: rs[0].region ? REGION_CONTENT[rs[0].region]?.slug ?? null : null,
      intro: farm.description,
      note: null,
      precision:
        "A specific farm named by the brand, with its location independently verified. The outline, where shown, is the administrative area around it, not the farm's own property line.",
      source: { url: farm.sourceUrl, label: "Verified source" },
      ...summarize(rs),
    });
  }

  cache = out;
  return out;
}
