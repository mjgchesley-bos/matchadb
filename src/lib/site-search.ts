import fs from "node:fs";
import path from "node:path";
import { getDb, getProducts } from "@/lib/db";
import { getCafeSlimIndex } from "@/lib/cafes";
import { cafeSlug, countryName } from "@/lib/cafe-types";
import { norm, lev } from "@/lib/cafe-search";
import { getPlaceIndex, cityPath } from "@/lib/cafe-places";
import { REGION_COORDINATES } from "@/lib/regions";
import { REGION_CONTENT } from "@/lib/region-content";
import { PRODUCERS } from "@/lib/producers";
import { CULTIVARS } from "@/lib/cultivars";

// One search for the whole site. Every word typed is matched separately against everything we know, so "brand + product",
// "city + cafe", a country, a region, a producer or a cultivar all work; typos are forgiven; and when nothing matches well
// it falls back to the closest guesses and then to popular picks, so the answer is never an empty box.
type Hit = { label: string; sub?: string; href: string };
type Item = { n: string; w: string[]; hit: Hit; weight?: number };

const STOP = new Set(["cafe", "cafes", "coffee", "shop", "matcha", "tea", "in", "the", "a", "of", "and", "near", "best", "buy"]);
const ALIAS: Record<string, string> = { usa: "united states", us: "united states", uk: "united kingdom", america: "united states", england: "united kingdom", korea: "south korea" };

// How well one typed word matches one word of an item: 1 exact, .9 starts with, .7 inside, .6 a typo away, else 0.
function wordScore(q: string, w: string): number {
  if (q === w) return 1;
  if (w.startsWith(q)) return q.length >= 2 ? 0.9 : 0;
  if (q.length >= 3 && w.includes(q)) return 0.7;
  if (q.length >= 4 && w.length >= 4) {
    const max = q.length >= 8 ? 2 : 1;
    if (lev(q, w, max) <= max) return 0.6;
  }
  return 0;
}

/** Mean of each typed word's best match among the item's words; no single word may score under `min`. */
function score(qw: string[], it: Item, min: number): number {
  let sum = 0;
  for (const q of qw) {
    let best = 0;
    for (const w of it.w) {
      const s = wordScore(q, w);
      if (s > best) best = s;
      if (best === 1) break;
    }
    if (best < min) return 0;
    sum += best;
  }
  return sum / qw.length + (it.n.startsWith(qw.join(" ")) ? 0.2 : 0);
}

function rank(items: Item[], qw: string[], min: number, limit: number): Hit[] {
  const out: { s: number; it: Item }[] = [];
  for (const it of items) {
    const s = score(qw, it, min);
    if (s > 0) out.push({ s: s + (it.weight ?? 0), it });
  }
  return out.sort((a, b) => b.s - a.s || a.it.hit.label.length - b.it.hit.label.length).slice(0, limit).map((x) => x.it.hit);
}

const mk = (label: string, href: string, sub?: string, extra = "", weight = 0): Item => {
  const n = norm(`${label} ${extra}`);
  return { n, w: n.split(" "), hit: { label, sub, href }, weight };
};

type Cache = { products: Item[]; brands: Item[]; places: Item[]; regions: Item[]; producers: Item[]; cultivars: Item[]; cafes: Item[] };
let cache: Cache | null = null;

async function build(): Promise<Cache> {
  if (cache) return cache;
  const db = await getDb();
  const res = db.exec("SELECT p.id, b.name, p.product_name FROM products p JOIN brands b ON p.brand_id = b.id WHERE p.not_found = 0");
  const rows = (res.length ? res[0].values : []) as [number, string, string][];
  const products = rows.map(([id, brand, name]) => mk(name, `/products/${id}`, brand, brand));
  const brandSet = [...new Set(rows.map((r) => r[1]))];
  const brands = brandSet.map((b) => mk(b, `/brands/${encodeURIComponent(b)}`));

  const idx = getPlaceIndex();
  const places: Item[] = [];
  for (const [cc, n] of idx.countries) {
    const name = countryName(cc);
    const al = Object.entries(ALIAS).filter(([, v]) => norm(v) === norm(name)).map(([k]) => k).join(" ");
    places.push(mk(name, `/cafes/in/${cc.toLowerCase()}`, `${n} cafés`, `${al} ${cc}`, 0.15));
  }
  for (const e of idx.cities.values()) {
    if (e.cafes.length < 3) continue;
    places.push(mk(e.city, cityPath(e), `${e.state ? e.state + ", " : ""}${countryName(e.cc)} · ${e.cafes.length} cafés`, `${e.state} ${countryName(e.cc)}`, Math.min(0.1, e.cafes.length / 2000)));
  }
  const regions = Object.entries(REGION_CONTENT).map(([key, c]) => {
    const info = REGION_COORDINATES[key];
    return mk(info?.name ?? key, `/regions/${c.slug}`, `Growing region${info ? ` · ${info.country}` : ""}`, `${key} ${info?.country ?? ""} region`);
  });
  const producers = PRODUCERS.map((p) => mk(p.name, `/producers/${p.slug}`, `Producer · ${p.basedIn}`, `${p.native ?? ""} ${p.brand}`));
  const cultivars = CULTIVARS.map((c) => mk(c.name, `/cultivars/${c.slug}`, "Cultivar", `${(c.aliases ?? []).join(" ")} cultivar`));
  let aliases: Record<string, string[]> = {};
  try {
    aliases = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "cafe-aliases.json"), "utf8"));
  } catch {
    /* optional */
  }
  const cafes: Item[] = [...getCafeSlimIndex().values()].map((r) => {
    const slug = cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] ?? "" });
    return mk(r[1], `/cafes/${slug}`, r[3], `${r[3]} ${r[4] ?? ""} ${r[9] ? countryName(r[9]) : ""} ${(aliases[r[0]] ?? []).join(" ")}`);
  });
  // Shops and brand-run stores (the stores directory: Kettl's shops, take-home shops...) are places people look for too, so they are found here as well.
  try {
    const shops = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "shops.json"), "utf8")) as [string, string, string, string, string, string, number, number, string, string, string[]][];
    for (const r of shops) cafes.push(mk(r[1], `/stores/${r[0]}`, r[3], `${r[3]} ${r[4] ?? ""} ${r[8] ? countryName(r[8]) : ""} ${(r[10] ?? []).join(" ")}`, 0.02));
  } catch {
    /* the stores list is optional */
  }
  cache = { products, brands, places, regions, producers, cultivars, cafes };
  return cache;
}

export async function searchAll(rawIn: string, opts: { only?: string; scale?: number } = {}) {
  const raw = rawIn.trim().slice(0, 80);
  const scale = opts.scale ?? 1;
  const all = norm(raw).split(" ").filter(Boolean);
  if (norm(raw).length < 2) return { groups: [], closest: false, popular: [] as Hit[] };
  const c = await build();

  // Product-only mode (the "Using now" picker needs just products, as {id, name, brand}).
  if (opts.only === "products") {
    const hits = rank(c.products, all, 0.6, 8).length ? rank(c.products, all, 0.6, 8) : rank(c.products, all.filter((w) => !STOP.has(w)), 0.6, 8);
    return { products: hits.map((h) => ({ id: Number(h.href.split("/").pop()), name: h.label, brand: h.sub ?? "" })) };
  }

  // Cafés lead: most people searching the site are looking for a place to drink matcha.
  const lists: [string, Item[], number][] = [
    ["cafes", c.cafes, Math.round(8 * scale)],
    ["places", c.places, Math.round(5 * scale)],
    ["brands", c.brands, Math.round(4 * scale)],
    ["products", c.products, Math.round(6 * scale)],
    ["producers", c.producers, Math.round(3 * scale)],
    ["regions", c.regions, Math.round(3 * scale)],
    ["cultivars", c.cultivars, Math.round(3 * scale)],
  ];
  const run = (qw: string[], min: number) => lists.map(([k, items, n]) => ({ key: k, hits: rank(items, qw, min, n) })).filter((g) => g.hits.length);

  // 1. every word matches (typos allowed); 2. ignoring filler words like "cafe"/"matcha"; 3. closest guesses: any one word matches.
  let groups = run(all, 0.6);
  let closest = false;
  if (!groups.length) {
    const core = all.filter((w) => !STOP.has(w));
    if (core.length && core.length < all.length) groups = run(core, 0.6);
  }
  if (!groups.length) {
    closest = true;
    for (const w of all.filter((x) => !STOP.has(x) && x.length >= 3)) {
      for (const x of run([w], 0.6)) {
        const e = groups.find((y) => y.key === x.key);
        if (e) e.hits.push(...x.hits.filter((h) => !e.hits.some((z) => z.href === h.href)));
        else groups.push(x);
      }
    }
    groups = groups.map((g) => ({ ...g, hits: g.hits.slice(0, 4) }));
  }
  // A group whose top hit is exactly what was typed (a country, a brand, a region) leads.
  const qn = all.join(" ");
  groups.sort((a, b) => Number(norm(b.hits[0].label) === qn) - Number(norm(a.hits[0].label) === qn));
  // 4. still nothing: popular picks, so the box is never empty.
  let popular: Hit[] = [];
  if (!groups.length) {
    const { products } = await getProducts({ page: 1, pageSize: 5, grades: [], flavors: [], uses: [] });
    popular = products.map((p) => ({ label: p.product_name, sub: p.brand_name, href: `/products/${p.id}` }));
  }
  return { groups, closest, popular };
}
