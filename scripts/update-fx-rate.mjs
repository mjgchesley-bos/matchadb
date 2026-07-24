// Refreshes data/fx-rate.json from a real, free, no-key exchange-rate API
// (Frankfurter, sourced from the ECB's daily reference rates) instead of the
// one-off manually-researched snapshot this used to be. Run daily by
// .github/workflows/daily-fx-update.yml, immediately followed by
// `npm run build:db` so every JPY/GBP/EUR price in the database gets
// reconverted against the fresh rate.
//
// Usage: node scripts/update-fx-rate.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FX_RATE_PATH = path.join(__dirname, "..", "data", "fx-rate.json");

const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY,GBP,EUR");
if (!res.ok) {
  throw new Error(`Frankfurter API request failed: ${res.status} ${res.statusText}`);
}
const data = await res.json();
const { JPY, GBP, EUR } = data.rates;
if (!JPY || !GBP || !EUR) {
  throw new Error(`Missing rate(s) in API response: ${JSON.stringify(data)}`);
}

// build-db.mjs expects usdToJpy as "JPY per 1 USD" (divides a JPY amount by
// it), and gbpToUsd/eurToUsd as "USD per 1 unit of that currency" (multiplies
// a GBP/EUR amount by it) -- Frankfurter's base=USD response gives JPY in
// that same "per 1 USD" form already, but GBP/EUR need inverting.
const fxRate = {
  usdToJpy: JPY,
  gbpToUsd: Math.round((1 / GBP) * 1e6) / 1e6,
  eurToUsd: Math.round((1 / EUR) * 1e6) / 1e6,
  asOf: data.date,
  source: "Frankfurter API (ECB daily reference rates), frankfurter.dev",
};

fs.writeFileSync(FX_RATE_PATH, JSON.stringify(fxRate, null, 2) + "\n");
console.log(`Updated data/fx-rate.json: 1 USD = ${JPY} JPY, 1 GBP = $${fxRate.gbpToUsd}, 1 EUR = $${fxRate.eurToUsd} (as of ${data.date})`);
