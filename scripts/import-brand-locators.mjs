// Merges places from brands' own public store locators into data/stores.json.
//
// A brand's own "where to buy" page is the brand telling us who carries it, so it is
// accepted as evidence for both the brand claim and the address. Each imported place
// is marked `listedBy` (the brand) so the site labels it "Brand's store locator" and
// not "Store website". Only US places are kept, and a place that already exists is
// matched on ZIP + street number + street name and gets the brand added to it.
//
// Locators on Stockist (stockist.co) expose their data as JSON, which is what the
// sources below read. Pages with other widgets go through scripts/import-brand-locators-json.mjs
// style inputs (see the `extra` file argument).
//
// Usage: node scripts/import-brand-locators.mjs [--dry] [extra.json]
//   extra.json: [{ brand, evidence, places: [{ name, address, city, state, zip, lat, lng, url?, kind, note? }] }]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "data", "stores.json");
const dry = process.argv.includes("--dry");
const extraFile = process.argv.slice(2).find((a) => !a.startsWith("--"));
const today = new Date().toISOString().slice(0, 10);

const SOCIAL = /instagram\.com|facebook\.com|tiktok\.com|yelp\.com|linktr\.ee|twitter\.com|x\.com\/|google\.com\/maps/i;

const STOCKIST = [
  {
    brand: "Rocky's",
    tag: "u21780",
    evidence: "https://www.rockysmatcha.com/pages/store-locator",
    classify: (f) => (f.has("Serving Matcha") ? "cafe" : f.has("Retail") ? "retailer" : null),
  },
  {
    brand: "Maeda-en",
    tag: "map_7q5erznq",
    evidence: "https://maeda-en.com/pages/where-to-find",
    classify: (f) => (f.has("Tea") ? "retailer" : null),
  },
  {
    brand: "Nami Matcha",
    tag: "map_pqkny8y3",
    evidence: "https://namimatcha.com/pages/store-locator",
    classify: (f) => (f.has("Serves Matcha") || f.has("Serves Hojicha") ? "cafe" : f.has("Sells Tins") ? "retailer" : null),
  },
];

const STATES = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC", "washington dc": "DC", "washington d.c.": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY" };
const stateCode = (v) => (/^[A-Za-z]{2}$/.test(v.trim()) ? v.trim().toUpperCase() : STATES[v.trim().toLowerCase()] ?? v.trim());
const STATE_RX = "[A-Z]{2}|" + Object.keys(STATES).sort((a, b) => b.length - a.length).join("|");

const SUFFIX =/\b(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pkwy|Parkway|Hwy|Highway|Ct|Court|Pl|Place|Sq|Square|Ter|Terrace|Cir|Circle|Plz|Plaza|Trl|Trail|Broadway|Row|Mall|Center|Centre)\.?(?=\s|$)/gi;
const UNIT = /^(?:,?\s*(?:Ste|Suite|Unit|Fl|Floor|Rm|Room|Bldg|Building|Space|Spc|#)\.?\s*[\w-]+)+/i;

function parseFull(full) {
  const s = full.replace(/,?\s*(United States|USA|US)\s*$/i, "").trim();
  const m = s.match(new RegExp(`^(.*?),?\\s*(${STATE_RX})\\s+(\\d{5})(?:-\\d{4})?$`, "i"));
  if (!m) return null;
  const head = m[1].trim();
  const state = stateCode(m[2]);
  const zip = m[3];
  const parts = head.split(/\s*,\s*/);
  if (parts.length >= 2) {
    const city = parts[parts.length - 1];
    const address = parts.slice(0, -1).join(", ");
    return { address, city, state, zip };
  }
  // No comma between street and city: split after the last street suffix (and any unit).
  let last = null;
  for (const x of head.matchAll(SUFFIX)) last = x;
  if (!last) return null;
  let cut = last.index + last[0].length;
  const unit = head.slice(cut).match(UNIT);
  if (unit) cut += unit[0].length;
  const city = head.slice(cut).replace(/^[,\s]+/, "").trim();
  if (!city) return null;
  return { address: head.slice(0, cut).trim(), city, state, zip };
}

const key = (zip, address) => {
  const m = address.toLowerCase().replace(/[.,#]/g, " ").trim().match(/^(\d+)[a-z]?\s+(?:(?:n|s|e|w|ne|nw|se|sw|north|south|east|west)\s+)?([a-z0-9]+)/);
  return m ? `${zip}|${m[1]}|${m[2]}` : `${zip}|${address.toLowerCase()}`;
};

const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const cleanName = (n) => n.replace(/\s+-\s+/g, " ").replace(/\s+/g, " ").trim();

const EXCLUDED = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "store-exclusions.json"), "utf8")).ids);
const stores = JSON.parse(fs.readFileSync(file, "utf8"));
const byKey = new Map(stores.map((s) => [key(s.zip, s.address), s]));
const ids = new Set(stores.map((s) => s.id));
const stats = {};
const rejected = [];

function add(brand, evidence, p, kind, note) {
  for (const f of ["name", "address", "city", "state", "zip"]) p[f] = String(p[f]).replace(/\s+/g, " ").trim();
  const k = key(p.zip, p.address);
  const existing = byKey.get(k);
  if (existing) {
    if (!existing.brands.some((b) => b.name === brand)) {
      existing.brands.push({ name: brand, evidence });
      stats[brand].merged++;
    } else stats[brand].dupe++;
    return;
  }
  const base = slug(`${p.name}-${p.city}-${p.state}`);
  if (EXCLUDED.has(base)) {
    stats[brand].skipped++;
    return;
  }
  let id = base;
  for (let i = 2; ids.has(id); i++) id = base + "-" + i;
  ids.add(id);
  const s = {
    id,
    name: p.name,
    kind,
    address: p.address,
    city: p.city,
    state: p.state,
    zip: p.zip,
    ...(p.url ? { url: p.url } : {}),
    ...(p.own ? {} : { listedBy: brand }),
    brands: [{ name: brand, evidence }],
    ...(note ? { note } : {}),
    checked: today,
    lat: p.lat,
    lng: p.lng,
  };
  stores.push(s);
  byKey.set(k, s);
  stats[brand].added++;
}

for (const src of process.argv.includes("--skip-stockist") ? [] : STOCKIST) {
  stats[src.brand] = { raw: 0, added: 0, merged: 0, dupe: 0, skipped: 0 };
  const res = await fetch(`https://stockist.co/api/v1/${src.tag}/locations/all`);
  const list = await res.json();
  stats[src.brand].raw = list.length;
  for (const l of list) {
    const f = new Set((l.filters ?? []).map((x) => x.name));
    const kind = src.classify(f);
    let p = null;
    if (l.address_line_1 && l.city && l.state && l.postal_code) {
      p = { address: [l.address_line_1, l.address_line_2].filter(Boolean).join(" ").trim(), city: l.city.trim(), state: stateCode(l.state), zip: String(l.postal_code).trim().slice(0, 5) };
    } else if (l.full_address) p = parseFull(l.full_address);
    const countryOk = !l.country || /^\s*(US|USA|United States)\s*$/i.test(l.country);
    if (!kind || !p || !countryOk || !/^[A-Z]{2}$/.test(p.state) || !/^\d{5}$/.test(p.zip) || l.latitude == null || l.longitude == null) {
      stats[src.brand].skipped++;
      if (countryOk && kind) rejected.push(`${src.brand}: ${l.name} | ${l.full_address ?? [l.address_line_1, l.city, l.state, l.postal_code].join(", ")}`);
      continue;
    }
    add(
      src.brand,
      src.evidence,
      { ...p, name: cleanName(l.name), lat: Number(Number(l.latitude).toFixed(6)), lng: Number(Number(l.longitude).toFixed(6)), url: l.website && !SOCIAL.test(l.website) ? l.website : undefined },
      kind
    );
  }
}

if (extraFile) {
  for (const src of JSON.parse(fs.readFileSync(extraFile, "utf8"))) {
    stats[src.brand] = stats[src.brand] ?? { raw: 0, added: 0, merged: 0, dupe: 0, skipped: 0 };
    for (const p of src.places) {
      stats[src.brand].raw++;
      add(src.brand, src.evidence, p, p.kind, p.note ?? src.note);
    }
  }
}

console.log(JSON.stringify(stats, null, 1));
console.log("rejected (US, could not parse or classify):", rejected.length);
for (const r of rejected.slice(0, 40)) console.log("  ", r);
console.log("total stores now:", stores.length);
if (!dry) {
  fs.writeFileSync(file, JSON.stringify(stores, null, 2) + "\n");
  console.log("written");
}
