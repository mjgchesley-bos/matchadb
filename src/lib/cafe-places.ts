import { getAllCafes } from "@/lib/cafes";
import type { Cafe } from "@/lib/cafe-types";

// Places hubs: /cafes/in (countries) -> /cafes/in/<cc> (cities) -> /cafes/in/<cc>/<city> (cafés). They give search engines real links
// to follow to every café page, and give visitors a way to browse by place without the map.
export const MIN_CAFES_FOR_CITY_PAGE = 3;

export const citySlug = (city: string, state: string): string => {
  const base = city.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  const st = state ? "-" + state.toLowerCase().replace(/[^a-z0-9]+/g, "") : "";
  return (base || "place") + st;
};

export type CityEntry = { cc: string; city: string; state: string; slug: string; cafes: Cafe[] };
type Index = { countries: Map<string, number>; cities: Map<string, CityEntry>; byCountry: Map<string, CityEntry[]> };
let index: Index | null = null;

export function getPlaceIndex(): Index {
  if (index) return index;
  const countries = new Map<string, number>();
  const cities = new Map<string, CityEntry>();
  for (const c of getAllCafes()) {
    const cc = (c.cc || "US").toUpperCase();
    countries.set(cc, (countries.get(cc) ?? 0) + 1);
    if (!c.city) continue;
    const slug = citySlug(c.city, cc === "US" ? c.state : "");
    const key = `${cc}/${slug}`;
    const e = cities.get(key) ?? { cc, city: c.city, state: cc === "US" ? c.state : "", slug, cafes: [] };
    e.cafes.push(c);
    cities.set(key, e);
  }
  const byCountry = new Map<string, CityEntry[]>();
  for (const e of cities.values()) {
    if (e.cafes.length < MIN_CAFES_FOR_CITY_PAGE) continue;
    byCountry.set(e.cc, [...(byCountry.get(e.cc) ?? []), e]);
  }
  for (const list of byCountry.values()) list.sort((a, b) => b.cafes.length - a.cafes.length || a.city.localeCompare(b.city));
  index = { countries, cities, byCountry };
  return index;
}

// Cafés in towns too small for their own city page (or with no city on record). Without this they are linked from nowhere but the sitemap and "nearby".
export const OTHER_CHUNK = 250;
export function otherCafes(cc: string): Cafe[] {
  const up = cc.toUpperCase();
  const idx = getPlaceIndex();
  const hubbed = new Set((idx.byCountry.get(up) ?? []).map((e) => e.slug));
  return getAllCafes()
    .filter((c) => (c.cc || "US").toUpperCase() === up && !(c.city && hubbed.has(citySlug(c.city, up === "US" ? c.state : ""))))
    .sort((a, b) => (a.state || "").localeCompare(b.state || "") || (a.city || "").localeCompare(b.city || "") || a.name.localeCompare(b.name));
}
export const otherPages = (cc: string): number => Math.ceil(otherCafes(cc).length / OTHER_CHUNK);

export const cityPath = (e: Pick<CityEntry, "cc" | "slug">): string => `/cafes/in/${e.cc.toLowerCase()}/${encodeURIComponent(e.slug)}`;
