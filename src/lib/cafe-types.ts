// Types and small helpers for the matcha café finder. Kept apart from cafes.ts, which reads
// data/cafes/*.json from disk and so can only run on the server.

export type CafeEvidence = {
  // The page on the café's own site that mentions matcha.
  u: string;
  // menu = a menu / drinks / order page; home = the homepage; other = some other page.
  k: "menu" | "home" | "other";
  // 3 = text on a menu page, 2 = text on another page, 1 = a menu item in the page's embedded data.
  st: 1 | 2 | 3;
  n: number;
  // A short quote around the word "matcha".
  s: string[];
};

export type Cafe = {
  id: string;
  name: string;
  cat: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  url: string | null;
  phone: string | null;
  // Matcha is front and centre (in the name, or mentioned a lot).
  focus: boolean;
  ev: CafeEvidence[];
  menu: string | null;
  platform: string | null;
  pdf: string | null;
  // Date the café's website was checked (YYYY-MM-DD).
  checked: string;
  // How many locations share this café's website (1 or more); the menu is the shared site's.
  shared: number;
};

// What the map and list need for each café: id, name, address, city, state, zip, lat, lng, focus (1/0).
export type CafeSlim = [string, string, string, string, string, string, number, number, number];

export const CAT_LABEL: Record<string, string> = {
  coffee_shop: "Coffee shop",
  cafe: "Café",
  bubble_tea_shop: "Boba and bubble tea",
  tea_room: "Tea room",
  coffee_roastery: "Coffee roaster",
  hong_kong_style_cafe: "Café",
  cat_cafe: "Cat café",
  dog_cafe: "Dog café",
};

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

// /cafes/{name}-{city}-{state}-{id}; the state and id at the end are what the page looks the café up by.
export const cafeSlug = (c: { name: string; city: string; state: string; id: string }): string =>
  `${[slugify(c.name), slugify(c.city)].filter(Boolean).join("-")}-${c.state.toLowerCase()}-${c.id}`;

export function parseCafeSlug(slug: string): { state: string; id: string } | null {
  const m = /-([a-z]{2})-([0-9a-f]{10})$/.exec(slug);
  return m ? { state: m[1].toUpperCase(), id: m[2] } : null;
}

export const directionsUrl = (c: { name: string; address: string; city: string; state: string; zip: string }): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${[c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")}`)}`;
