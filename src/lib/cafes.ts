import fs from "node:fs";
import path from "node:path";
import { parseCafeSlug, type Cafe, type CafeSlim } from "./cafe-types";

// Cafés whose own website mentions matcha, by state (data/cafes/{ST}.json). Built by
// scripts/cafes/ from open place data (Overture Maps) plus a check of each café's own site; a café
// is listed only when its site says matcha, and the page it said it on is kept as evidence.
// The map reads the slim list in public/data/cafes-slim.json instead.

const cache = new Map<string, Cafe[]>();

export function getCafesInState(state: string): Cafe[] {
  const st = state.toUpperCase();
  if (!/^[A-Z]{2}$/.test(st)) return [];
  const hit = cache.get(st);
  if (hit) return hit;
  let list: Cafe[] = [];
  try {
    list = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafes", `${st}.json`), "utf8")) as Cafe[];
  } catch {
    list = [];
  }
  cache.set(st, list);
  return list;
}

export function getCafeBySlug(slug: string): Cafe | null {
  const p = parseCafeSlug(slug);
  if (!p) return null;
  return getCafesInState(p.state).find((c) => c.id === p.id) ?? null;
}

export function getCafeStates(): string[] {
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

// The slim map list indexed by café id (name, city, state), for pages that only have ids.
let slimIndex: Map<string, CafeSlim> | null = null;
export function getCafeSlimIndex(): Map<string, CafeSlim> {
  if (slimIndex) return slimIndex;
  try {
    const rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "cafes-slim.json"), "utf8")) as CafeSlim[];
    slimIndex = new Map(rows.map((r) => [r[0], r]));
  } catch {
    slimIndex = new Map();
  }
  return slimIndex;
}

export function getAllCafes(): Cafe[] {
  return getCafeStates().flatMap((s) => getCafesInState(s));
}

// Other cafés near this one (same state), closest first.
export function nearbyCafes(c: Cafe, limit = 5): (Cafe & { miles: number })[] {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  return getCafesInState(c.state)
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
