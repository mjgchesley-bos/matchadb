import fs from "node:fs";
import path from "node:path";
import type { Reseller, Store } from "./store-types";

// In-person places to find the matcha brands in this database: a brand's own
// shops and cafés, and independent retailers whose own website says they stock a
// brand. Every brand claim carries the URL it came from and the date it was
// checked, and nothing is listed from memory or hearsay. A store without a
// verified address and coordinates is left out, because a wrong pin is worse than
// a missing one. To add stores, edit data/stores.json and run
// `node scripts/geocode-stores.mjs` to fill in coordinates.

// Stores that carry a brand: the brand's own shops and independent retailers whose
// own website says they stock it (see data/stores.json for the source of each claim).
export function storesForBrand(name: string): Store[] {
  return getStores().filter((s) => s.brands.some((b) => b.name === name));
}

// Online resellers and Amazon stores/listings for a brand, from data/resellers.json.
// Listed only when the brand's own site, the reseller's own site, or the Amazon page
// itself backs it up.
export function resellersForBrand(name: string): Reseller[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "resellers.json"), "utf8")) as Reseller[];
  return raw.filter((r) => r.brand === name);
}

// Extra context shown above a brand's store list, only where the brand itself has said
// something about who may sell its products.
export const BRAND_RESELLER_NOTES: Record<string, { text: string; label: string; url: string }> = {
  "Marukyu Koyamaen": {
    text: "Marukyu Koyamaen publishes a list of resellers it says are unauthorized, because its matcha is often resold at inflated prices.",
    label: "Marukyu Koyamaen's unauthorized reseller list",
    url: "https://www.marukyu-koyamaen.co.jp/information/news-3102/",
  },
};

export function getStores(): Store[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "stores.json"), "utf8")) as Partial<Store>[];
  return raw.filter((s): s is Store => typeof s.lat === "number" && typeof s.lng === "number");
}
