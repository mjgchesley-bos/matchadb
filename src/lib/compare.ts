import { getBrandProducts, type ProductRow } from "./db";
import { getGuideRows, groupBy, summarize, type Group, type Summary } from "./guide-data";
import { shippingInfo, shippingLabel } from "./shipping";
import { slugify } from "./slug";

// Head-to-head pages for brand pairs people search for ("Ippodo vs Marukyu
// Koyamaen"). Every figure is computed from the product table; the pages state
// facts side by side (price per gram, grades, named regions and cultivars,
// shipping) and never rank taste or quality. To add a pair, add it here: both
// names must match the brands table exactly, and each needs a handful of
// priced powders for the medians to mean anything.
export const PAIRS: [string, string][] = [
  ["Ippodo", "Marukyu Koyamaen"],
  ["Ippodo", "Aiya"],
  ["Ippodo", "Kettl"],
  ["Ippodo", "Jade Leaf Matcha"],
  ["Ippodo", "Tezumi"],
  ["Ippodo", "Nakamura Tokichi"],
  ["Marukyu Koyamaen", "Aiya"],
  ["Marukyu Koyamaen", "Kettl"],
  ["Jade Leaf Matcha", "Encha"],
  ["Jade Leaf Matcha", "Mizuba Tea Co"],
  ["Jade Leaf Matcha", "Aiya"],
  ["Encha", "Mizuba Tea Co"],
  ["Tezumi", "Kettl"],
  ["Nakamura Tokichi", "Gion Tsujiri"],
  ["Rocky's", "Naoki Matcha"],
];

export const pairSlug = (a: string, b: string) => `${slugify(a)}-vs-${slugify(b)}`;

export function pairBySlug(slug: string): [string, string] | undefined {
  return PAIRS.find(([a, b]) => pairSlug(a, b) === slug);
}

export function comparisonsFor(brand: string): { slug: string; other: string }[] {
  return PAIRS.filter(([a, b]) => a === brand || b === brand).map(([a, b]) => ({ slug: pairSlug(a, b), other: a === brand ? b : a }));
}

export type BrandSide = {
  name: string;
  total: number;
  powders: Summary;
  cheapest: ProductRow | null;
  priciest: ProductRow | null;
  grades: { name: string; count: number }[];
  regions: { name: string; count: number }[];
  regionShare: number;
  cultivars: { name: string; count: number }[];
  organicShare: number;
  shipping: string;
  shippingNote: string | null;
  spread: ProductRow[];
};

export type LoadedComparison = { a: BrandSide; b: BrandSide; groupsA: Group[]; groupsB: Group[] };

function tally(values: (string | null)[], n: number): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count || x.name.localeCompare(y.name)).slice(0, n);
}

// n products spread across the brand's own price range, so a list shows the
// range rather than only its cheapest or best-known items.
function spread(rows: ProductRow[], n: number): ProductRow[] {
  const sorted = [...rows].sort((x, y) => (x.price_per_gram as number) - (y.price_per_gram as number));
  if (sorted.length <= n) return sorted;
  const out: ProductRow[] = [];
  for (let i = 0; i < n; i++) out.push(sorted[Math.round((i * (sorted.length - 1)) / (n - 1))]);
  return out;
}

async function loadSide(name: string): Promise<{ side: BrandSide; rows: ProductRow[] }> {
  // No shipping filter: a comparison is about the brands, and each side states its own shipping.
  const [all, rows] = await Promise.all([getBrandProducts(name), getGuideRows({ brands: [name] }, undefined)]);
  const live = all.filter((p) => p.not_found === 0);
  const byPpg = [...rows].sort((x, y) => (x.price_per_gram as number) - (y.price_per_gram as number));
  const info = shippingInfo(name);
  return {
    rows,
    side: {
      name,
      total: live.length,
      powders: summarize(rows),
      cheapest: byPpg[0] ?? null,
      priciest: byPpg[byPpg.length - 1] ?? null,
      grades: tally(live.map((p) => p.grade ?? "Not stated"), 4),
      regions: tally(live.map((p) => p.region), 4),
      regionShare: live.length ? live.filter((p) => p.region).length / live.length : 0,
      cultivars: tally(live.map((p) => p.cultivar), 3),
      organicShare: live.length ? live.filter((p) => p.organic_certified === 1).length / live.length : 0,
      shipping: shippingLabel(name) ?? "No known restriction",
      shippingNote: info ? info.note : null,
      spread: spread(rows, 6),
    },
  };
}

export async function loadComparison(a: string, b: string): Promise<LoadedComparison> {
  const [A, B] = await Promise.all([loadSide(a), loadSide(b)]);
  return { a: A.side, b: B.side, groupsA: groupBy(A.rows, "grade", 2), groupsB: groupBy(B.rows, "grade", 2) };
}
