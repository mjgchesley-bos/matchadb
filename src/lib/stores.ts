import fs from "node:fs";
import path from "node:path";
import type { Store } from "./store-types";

// In-person places to find the matcha brands in this database: a brand's own
// shops and cafés, and independent retailers whose own website says they stock a
// brand. Every brand claim carries the URL it came from and the date it was
// checked, and nothing is listed from memory or hearsay. A store without a
// verified address and coordinates is left out, because a wrong pin is worse than
// a missing one. To add stores, edit data/stores.json and run
// `node scripts/geocode-stores.mjs` to fill in coordinates.

export function getStores(): Store[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "stores.json"), "utf8")) as Partial<Store>[];
  return raw.filter((s): s is Store => typeof s.lat === "number" && typeof s.lng === "number");
}
