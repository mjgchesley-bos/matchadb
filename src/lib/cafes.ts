import fs from "node:fs";
import path from "node:path";
import { cafeFileKey, cafeSlug, parseCafeSlug, type Cafe, type CafeSlim } from "./cafe-types";
import { REGIONS } from "./cafe-regions";

// Cafés whose own website mentions matcha, by US state or by country (data/cafes/{ST or CCC}.json).
// Built by scripts/cafes/ from open place data (Overture Maps) plus a check of each café's own site; a
// café is listed only when its site says matcha, and the page it said it on is kept as evidence.
// The map reads the slim lists in public/data/cafes-slim-{region}.json instead.

const cache = new Map<string, Cafe[]>();

export function getCafesInFile(key: string): Cafe[] {
  const k = key.toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(k)) return [];
  const hit = cache.get(k);
  if (hit) return hit;
  let list: Cafe[] = [];
  try {
    list = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafes", `${k}.json`), "utf8")) as Cafe[];
  } catch {
    list = [];
  }
  cache.set(k, list);
  return list;
}

export function getCafeBySlug(slug: string): Cafe | null {
  const p = parseCafeSlug(slug);
  if (!p) return null;
  return getCafesInFile(p.key).find((c) => c.id === p.id) ?? null;
}

export function getCafeFiles(): string[] {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), "data", "cafes"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .sort();
  } catch {
    return [];
  }
}

// The slim map lists indexed by café id (name, city, state, country), for pages that only have ids.
let slimIndex: Map<string, CafeSlim> | null = null;
export function getCafeSlimIndex(): Map<string, CafeSlim> {
  if (slimIndex) return slimIndex;
  const idx = new Map<string, CafeSlim>();
  for (const r of REGIONS) {
    try {
      const rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", `cafes-slim-${r.key}.json`), "utf8")) as CafeSlim[];
      for (const row of rows) idx.set(row[0], row);
    } catch {
      // a region with no file yet
    }
  }
  slimIndex = idx;
  return idx;
}

export function getAllCafes(): Cafe[] {
  return getCafeFiles().flatMap((s) => getCafesInFile(s));
}

// The sitemap lists cafés in files of this many URLs (see app/cafes-sitemap/sitemap.ts).
export const SITEMAP_CHUNK = 10000;
export const cafeSitemapCount = (): number => Math.max(1, Math.ceil(getAllCafes().length / SITEMAP_CHUNK));

// Other cafés near this one (same state or country), closest first.
export function nearbyCafes(c: Cafe, limit = 5): (Cafe & { miles: number })[] {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  return getCafesInFile(cafeFileKey(c))
    .filter((o) => o.id !== c.id)
    .map((o) => {
      const dLat = rad(o.lat - c.lat);
      const dLng = rad(o.lng - c.lng);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(c.lat)) * Math.cos(rad(o.lat)) * Math.sin(dLng / 2) ** 2;
      return { ...o, miles: 2 * R * Math.asin(Math.sqrt(x)) };
    })
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

// "Select chains" the owner chose to list (scripts/cafes/weekly/select_chains.json): one entry per brand, which may use several websites.
let selectBrands: string[][] | null = null;
function getSelectBrands(): string[][] {
  if (selectBrands) return selectBrands;
  let out: string[][] = [];
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts", "cafes", "weekly", "select_chains.json"), "utf8")) as { brands: { hosts: string[] }[] };
    out = j.brands.map((b) => b.hosts.map((h) => h.toLowerCase()));
  } catch {
    // no list: no select chains
  }
  selectBrands = out;
  return out;
}
const hostKey = (u?: string | null): string => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "").toLowerCase() : "";
  } catch {
    return "";
  }
};

// Websites shared by unrelated places (social pages, ordering platforms, site builders): never a brand.
const SHARED_HOSTS = /instagram|facebook|toasttab|squareup|square\.site|foodora|chownow|onelink|linktr|ubereats|doordash|grubhub|google|yelp|wixsite|weebly|business\.site|godaddysites|shopinfo|jimdo|fc2|ameblo|tabelog|hotpepper|gnavi|retty|ocnk|base\.shop|thebase|stores\.jp|studio\.site|peraichi|wordpress\.com|blogspot/i;
const nameStem = (n: string) => n.normalize("NFKC").toLowerCase().replace(/\(.*?\)|（.*?）/g, "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 6);

export type ChainSibling = { id: string; label: string; slug: string };

// Groups of locations that belong to one brand: a website used by 3+ locations that mostly share a name (a directory host mixes unrelated names),
// plus owner-chosen select chains, whose several websites count as one brand. Used to show reviews from a brand's other locations.
let chainGroups: { byHost: Map<string, string>; groups: Map<string, Cafe[]> } | null = null;
function getChainGroups() {
  if (chainGroups) return chainGroups;
  const byHost = new Map<string, Cafe[]>();
  for (const f of getCafeFiles())
    for (const x of getCafesInFile(f)) {
      const k = hostKey(x.url);
      if (k && !SHARED_HOSTS.test(k)) byHost.set(k, [...(byHost.get(k) ?? []), x]);
    }
  const hostGroup = new Map<string, string>();
  const groups = new Map<string, Cafe[]>();
  getSelectBrands().forEach((hosts, i) => {
    const key = `sel:${i}`;
    for (const h of hosts) {
      hostGroup.set(h, key);
      groups.set(key, [...(groups.get(key) ?? []), ...(byHost.get(h) ?? [])]);
    }
  });
  for (const [h, list] of byHost) {
    if (hostGroup.has(h) || list.length < 3) continue;
    const counts = new Map<string, number>();
    for (const x of list) counts.set(nameStem(x.name), (counts.get(nameStem(x.name)) ?? 0) + 1);
    if (Math.max(...counts.values()) / list.length < 0.5) continue;
    hostGroup.set(h, `host:${h}`);
    groups.set(`host:${h}`, list);
  }
  chainGroups = { byHost: hostGroup, groups };
  return chainGroups;
}

// The other locations of the same brand, for showing their reviews on a location that has few of its own.
// label = the part of the name after " - " (e.g. "West Lynn"), else the city.
export function chainSiblings(c: Cafe): ChainSibling[] {
  const h = hostKey(c.url);
  const { byHost, groups } = getChainGroups();
  const g = h ? byHost.get(h) : undefined;
  if (!g) return [];
  const sibs = (groups.get(g) ?? []).filter((x) => x.id !== c.id);
  // Several locations in one city (Burnet Rd and South Congress, both Austin): name them by street so the tag says which one.
  const cityCount = new Map<string, number>();
  for (const x of [c, ...sibs]) cityCount.set(x.city, (cityCount.get(x.city) ?? 0) + 1);
  const street = (a: string) => a.replace(/^\s*\d+[\s-]*/, "").replace(/[,\s]+(ste\.?|suite|unit|#).*$/i, "").trim();
  return sibs.map((x) => ({
    id: x.id,
    label: x.name.includes(" - ") ? x.name.split(" - ").pop()!.trim() : (cityCount.get(x.city) ?? 0) > 1 && street(x.address) ? `${x.city}, ${street(x.address)}` : x.city,
    slug: cafeSlug(x),
  }));
}

// A venue removed as a duplicate forwards to the listing that stayed (data/cafe-redirects.json, built by scripts/build-redirects.py).
let redirects: Record<string, string> | null = null;
export function redirectedCafeSlug(slug: string): string | null {
  const p = parseCafeSlug(slug);
  if (!p) return null;
  if (!redirects) {
    try {
      redirects = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafe-redirects.json"), "utf8")) as Record<string, string>;
    } catch {
      redirects = {};
    }
  }
  const to = redirects[p.id];
  const r = to ? getCafeSlimIndex().get(to) : null;
  return r ? cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] }) : null;
}
