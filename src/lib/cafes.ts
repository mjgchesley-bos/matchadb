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

// "Select chains" the owner chose to list (scripts/cafes/weekly/select_chains.json): outlets of one brand share a website host.
let selectHosts: Set<string> | null = null;
function getSelectHosts(): Set<string> {
  if (selectHosts) return selectHosts;
  const set = new Set<string>();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts", "cafes", "weekly", "select_chains.json"), "utf8")) as { brands: { hosts: string[] }[] };
    for (const b of j.brands) for (const h of b.hosts) set.add(h.toLowerCase());
  } catch {
    // no list: no select chains
  }
  selectHosts = set;
  return set;
}
const hostKey = (u?: string | null): string => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "").toLowerCase() : "";
  } catch {
    return "";
  }
};
let chainIndex: Map<string, Cafe[]> | null = null;

export type ChainSibling = { id: string; label: string; slug: string };

// The other locations of a select chain (same website host), for showing their reviews on a location that has few of its own.
// label = the part of the name after " - " (e.g. "West Lynn"), else the city.
export function chainSiblings(c: Cafe): ChainSibling[] {
  const h = hostKey(c.url);
  if (!h || !getSelectHosts().has(h)) return [];
  if (!chainIndex) {
    chainIndex = new Map();
    const hosts = getSelectHosts();
    for (const f of getCafeFiles())
      for (const x of getCafesInFile(f)) {
        const k = hostKey(x.url);
        if (k && hosts.has(k)) chainIndex.set(k, [...(chainIndex.get(k) ?? []), x]);
      }
  }
  return (chainIndex.get(h) ?? [])
    .filter((x) => x.id !== c.id)
    .map((x) => ({ id: x.id, label: x.name.includes(" - ") ? x.name.split(" - ").pop()!.trim() : x.city, slug: cafeSlug(x) }));
}
