import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCanonicalPrice } from "./price-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(path.join(__dirname, "..", "data", "matcha.db"));
  const db = new SQL.Database(buf);

  const res = db.exec(`
    SELECT p.id, b.name, p.product_name, p.disclosed_json,
           (SELECT GROUP_CONCAT(contradiction_text, ' || ') FROM contradictions c WHERE c.product_id = p.id) as contradictions
    FROM products p JOIN brands b ON p.brand_id = b.id
  `);
  const rows = res[0].values;

  let resolved = 0;
  let noPair = 0;
  let conflicting = 0;
  let flaggedByContradiction = 0;

  const reviewList = [];

  for (const row of rows) {
    const [id, brand, product, disclosedJson, contradictions] = row;
    const disclosed = JSON.parse(disclosedJson);
    const result = resolveCanonicalPrice(disclosed, contradictions || "");

    if (!result.needsReview) {
      resolved++;
    } else {
      if (result.reviewReason === "no_price_size_pair_found") noPair++;
      else if (result.reviewReason === "conflicting_prices_at_smallest_size") conflicting++;
      else if (result.reviewReason === "flagged_price_contradiction_in_research") flaggedByContradiction++;
      reviewList.push({ id, brand, product, ...result });
    }
  }

  console.log(`Total products: ${rows.length}`);
  console.log(`Cleanly resolved: ${resolved}`);
  console.log(`Needs review - no pair found: ${noPair}`);
  console.log(`Needs review - conflicting prices at smallest size: ${conflicting}`);
  console.log(`Needs review - had a price-related contradiction flagged in research: ${flaggedByContradiction}`);
  console.log(`Total needing review: ${reviewList.length}`);

  console.log("\n--- Sample of 10 cleanly resolved (spot-check these) ---");
  let shown = 0;
  for (const row of rows) {
    if (shown >= 10) break;
    const [id, brand, product, disclosedJson, contradictions] = row;
    const disclosed = JSON.parse(disclosedJson);
    const result = resolveCanonicalPrice(disclosed, contradictions || "");
    if (!result.needsReview) {
      console.log(`  [${id}] ${brand} - ${product}: ${result.priceCurrency} ${result.priceNative} for ${result.priceSizeGrams}g` + (result.priceCurrency === "JPY" ? " (JPY)" : ""));
      shown++;
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "..", "data", "price-review-needed.json"),
    JSON.stringify(reviewList, null, 2)
  );
  console.log(`\nFull review list written to data/price-review-needed.json (${reviewList.length} products)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
