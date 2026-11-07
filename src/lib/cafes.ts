import fs from "node:fs";
import path from "node:path";
import { cafeFileKey, parseCafeSlug, type Cafe, type CafeSlim } from "./cafe-types";
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
