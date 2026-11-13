import { INTL_LANG, type Locale } from "@/i18n/config";

// Types and small helpers for the matcha café finder. Kept apart from cafes.ts, which reads
// data/cafes/*.json from disk and so can only run on the server.

export type CafeEvidence = {
  // The page on the café's own site that mentions matcha.
  u: string;
  // menu = a menu / drinks / order page; home = the homepage; other = some other page.
  k: "menu" | "home" | "other";
  // 3 = text on a menu page, 2 = text on another page, 1 = a menu item in the page's embedded data, 0 = none (name only).
  st: 0 | 1 | 2 | 3;
  n: number;
  // A short quote around the word "matcha" (or 抹茶 / 말차).
  s: string[];
};

export type Cafe = {
  id: string;
  name: string;
  cat: string;
  // ISO 3166 alpha-2 country code; missing on the first US-only data means US.
  cc?: string;
  address: string;
  city: string;
  // US state; empty for other countries.
  state: string;
  zip: string;
  lat: number;
  lng: number;
  url: string | null;
  phone: string | null;
  // Matcha is front and centre (in the name, or mentioned a lot).
  focus: boolean;
  ev: CafeEvidence[];
  // "name": listed because matcha is in the business's own name (no menu seen yet). "web": found on a web search lead and its own site.
  // "reported": its own site shows no matcha (or has no site), but 2+ independent local sources say it serves matcha; ev holds those sources.
  via?: "name" | "web" | "reported";
  menu: string | null;
  platform: string | null;
  pdf: string | null;
  // Date the café's website was checked (YYYY-MM-DD).
  checked: string;
  // How many locations share this café's website (1 or more); the menu is the shared site's.
  shared: number;
};

// What the map and list need for each café: id, name, address, city, state, zip, lat, lng, focus (1/0), country code.
// focus: 0 = matcha on their site, 1 = matcha-focused, 2 = listed because matcha is in the name, 3 = reported by local sources.
export type CafeSlim = [string, string, string, string, string, string, number, number, number, string?];

export const CAT_LABEL: Record<string, string> = {
  coffee_shop: "Coffee shop",
  cafe: "Café",
  bubble_tea_shop: "Boba and bubble tea",
  tea_room: "Tea room",
  coffee_roastery: "Coffee roaster",
  hong_kong_style_cafe: "Café",
  cat_cafe: "Cat café",
  dog_cafe: "Dog café",
  dessert_shop: "Dessert shop",
  ice_cream_shop: "Ice cream",
  gelato_shop: "Gelato",
  smoothie_juice_bar: "Juice and smoothie bar",
  juice_bar: "Juice bar",
  bakery: "Bakery",
  donut_shop: "Donuts",
  creperie: "Crêperie",
  breakfast_and_brunch_restaurant: "Brunch spot",
  health_food_restaurant: "Health food",
  vegan_restaurant: "Vegan",
  japanese_restaurant: "Japanese restaurant",
  restaurant: "Restaurant",
  food_truck_stand: "Food truck",
  bagel_shop: "Bagels",
  bar: "Bar",
};

export const COUNTRY_NAME: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  JP: "Japan",
  KR: "South Korea",
  AU: "Australia",
  GB: "United Kingdom",
  IE: "Ireland",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  LU: "Luxembourg",
  AT: "Austria",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  PL: "Poland",
  CZ: "Czechia",
  SK: "Slovakia",
  HU: "Hungary",
  GR: "Greece",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SI: "Slovenia",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  MT: "Malta",
  CY: "Cyprus",
};

// A country's name in the visitor's language (the browser knows them all; English falls back to the table above).
export function countryName(cc: string, lang: Locale = "en"): string {
  if (lang === "en") return COUNTRY_NAME[cc] ?? cc;
  try {
    return new Intl.DisplayNames([INTL_LANG[lang]], { type: "region" }).of(cc) ?? COUNTRY_NAME[cc] ?? cc;
  } catch {
    return COUNTRY_NAME[cc] ?? cc;
  }
}

// Page addresses for places outside the US end in the three-letter country code; US ones end in the state.
const CC3: Record<string, string> = {
  CA: "can", JP: "jpn", KR: "kor", AU: "aus", NZ: "nzl", GB: "gbr", IE: "irl", FR: "fra", DE: "deu", IT: "ita", ES: "esp", PT: "prt", NL: "nld", BE: "bel", LU: "lux", AT: "aut", CH: "che",
  SE: "swe", NO: "nor", DK: "dnk", FI: "fin", IS: "isl", PL: "pol", CZ: "cze", SK: "svk", HU: "hun", GR: "grc", RO: "rou", BG: "bgr", HR: "hrv", SI: "svn", EE: "est",
  LV: "lva", LT: "ltu", MT: "mlt", CY: "cyp",
};
const FROM_CC3 = Object.fromEntries(Object.entries(CC3).map(([a, b]) => [b, a]));

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

// The data file a café lives in: its US state, or its three-letter country code.
export const cafeFileKey = (c: { cc?: string; state: string }): string => (!c.cc || c.cc === "US" ? c.state.toUpperCase() : (CC3[c.cc] ?? "xxx").toUpperCase());

// /cafes/{name}-{city}-{state or country}-{id}; the part before the id is what the page looks the café up by.
export const cafeSlug = (c: { name: string; city: string; state: string; id: string; cc?: string }): string => {
  const base = [slugify(c.name), slugify(c.city)].filter(Boolean).join("-");
  const where = !c.cc || c.cc === "US" ? c.state.toLowerCase() : (CC3[c.cc] ?? "xxx");
  return `${base ? base + "-" : ""}${where}-${c.id}`;
};

export function parseCafeSlug(slug: string): { key: string; id: string } | null {
  // Ids are 10 hex characters, or "fsq" plus 7 hex characters for places that came from Foursquare.
  const m = /-([a-z]{2,3})-((?:fsq[0-9a-f]{7})|[0-9a-f]{10})$/.exec(slug) ?? /^([a-z]{2,3})-((?:fsq[0-9a-f]{7})|[0-9a-f]{10})$/.exec(slug);
  if (!m) return null;
  if (m[1].length === 3 && !FROM_CC3[m[1]]) return null;
  return { key: m[1].toUpperCase(), id: m[2] };
}

// "6801 Hollywood Blvd, Los Angeles, CA 90028" in the US; address, city, postcode and country elsewhere,
// leaving out any part the address already contains.
export function formatPlace(c: { address: string; city: string; state: string; zip: string; cc?: string }, lang: Locale = "en"): string {
  if (!c.cc || c.cc === "US") return [c.address, c.city, `${c.state} ${c.zip}`.trim()].filter(Boolean).join(", ");
  const parts: string[] = [];
  for (const p of [c.address, c.city, c.zip]) {
    const t = (p ?? "").trim();
    if (t && !parts.some((x) => x.includes(t))) parts.push(t);
  }
  return [...parts, countryName(c.cc, lang)].join(", ");
}

export const directionsUrl = (c: { name: string; address: string; city: string; state: string; zip: string; cc?: string }): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${formatPlace(c)}`)}`;
