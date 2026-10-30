// Fills in lat/lng for every store in data/stores.json that doesn't have them yet,
// using the Mapbox Geocoding API, and prints each result so it can be eyeballed:
// a store whose geocoded city or ZIP doesn't match the address is flagged and
// left without coordinates, because a wrong pin is worse than a missing one.
//
// Usage: node scripts/geocode-stores.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!token) throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN missing");

const file = path.join(__dirname, "..", "data", "stores.json");
const stores = JSON.parse(fs.readFileSync(file, "utf8"));

let changed = 0;
let flagged = 0;
for (const s of stores) {
  if (typeof s.lat === "number" && typeof s.lng === "number") continue;
  const q = `${s.address}, ${s.city}, ${s.state} ${s.zip}`;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=us&types=address&limit=1`;
  const res = await fetch(url);
  const json = await res.json();
  const f = json.features?.[0];
  if (!f) {
    console.log(`NO RESULT  ${s.id}: ${q}`);
    flagged++;
    continue;
  }
  const ctx = (f.context ?? []).map((c) => `${c.id.split(".")[0]}:${c.text}`).join(" | ");
  const zipOk = (f.context ?? []).some((c) => c.id.startsWith("postcode") && c.text === s.zip);
  const cityOk = (f.context ?? []).some((c) => /^(place|locality|neighborhood)/.test(c.id) && c.text.toLowerCase().includes(s.city.toLowerCase().split(" ")[0]));
  const ok = f.relevance >= 0.9 && (zipOk || cityOk);
  console.log(`${ok ? "ok  " : "CHECK"} ${s.id}: ${f.place_name}  [rel ${f.relevance}] (${f.center[1].toFixed(5)}, ${f.center[0].toFixed(5)})${ok ? "" : "  <- " + ctx}`);
  if (!ok) {
    flagged++;
    continue;
  }
  s.lat = Number(f.center[1].toFixed(6));
  s.lng = Number(f.center[0].toFixed(6));
  changed++;
}
fs.writeFileSync(file, JSON.stringify(stores, null, 2) + "\n");
console.log(`\n${changed} geocoded, ${flagged} flagged for review.`);
