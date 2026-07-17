// Post-processes data/live-prices.json: any variant whose label didn't
// parse to a gram weight (e.g. "100 Servings") gets a second attempt using
// the product's own disclosed research data, if it states a servings-to-
// grams ratio (e.g. Breakaway Matcha's serving_size: "One gram..."). Same
// conservative rule as the archived-data path: never assumed, only applied
// when the ratio is explicitly stated for that specific product.
//
// Usage: node scripts/resolve-live-price-sizes.mjs

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gramsPerServingFromDisclosed, parseServingsFromLabel } from "./price-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVE_PATH = path.join(__dirname, "..", "data", "live-prices.json");
const DB_PATH = path.join(__dirname, "..", "data", "matcha.db");

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const live = JSON.parse(fs.readFileSync(LIVE_PATH, "utf-8"));

  let resolved = 0;
  let stillUnresolved = 0;

  for (const entry of Object.values(live)) {
    if (entry.status !== "ok") continue;
    const nullVariants = entry.variants.filter((v) => v.grams == null);
    if (nullVariants.length === 0) continue;

    const res = db.exec("SELECT disclosed_json FROM products WHERE id = ?", [entry.id]);
    if (!res[0]) continue;
    const disclosed = JSON.parse(res[0].values[0][0]);
    const gramsPerServing = gramsPerServingFromDisclosed(disclosed);

    for (const v of entry.variants) {
      if (v.grams != null) continue;
      if (gramsPerServing != null) {
        const servings = parseServingsFromLabel(v.label);
        if (servings != null) {
          v.grams = servings * gramsPerServing;
          resolved++;
          continue;
        }
      }
      stillUnresolved++;
    }
  }

  fs.writeFileSync(LIVE_PATH, JSON.stringify(live, null, 2));
  console.log(`Resolved via servings-to-grams: ${resolved}`);
  console.log(`Still unresolved (excluded from product_prices): ${stillUnresolved}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
