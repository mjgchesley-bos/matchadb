import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPricePairs, resolveCanonicalPrice } from "./price-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// re-derive whether ANY amount was found at all (regardless of weight pairing)
function anyAmountFound(disclosed) {
  const text = JSON.stringify(disclosed);
  return /\$\s?\d|USD\s?\d|¥\s?\d|JPY\s?\d|\d\s?yen/i.test(text);
}

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(path.join(__dirname, "..", "data", "matcha.db"));
  const db = new SQL.Database(buf);

  const res = db.exec(`
    SELECT p.id, b.name, p.product_name, p.source_url, p.disclosed_json,
           (SELECT GROUP_CONCAT(contradiction_text, ' || ') FROM contradictions c WHERE c.product_id = p.id) as contradictions
    FROM products p JOIN brands b ON p.brand_id = b.id
  `);
  const rows = res[0].values;

  const noPriceAtAll = [];
  const ambiguousSize = [];
  const conflicting = [];
  const contradictionFlagged = [];

  for (const row of rows) {
    const [id, brand, product, sourceUrl, disclosedJson, contradictions] = row;
    const disclosed = JSON.parse(disclosedJson);
    const result = resolveCanonicalPrice(disclosed, contradictions || "");
    if (!result.needsReview) continue;

    const entry = { id, brand, product, sourceUrl, ...result };

    if (result.reviewReason === "flagged_price_contradiction_in_research") {
      contradictionFlagged.push(entry);
    } else if (result.reviewReason === "conflicting_prices_at_smallest_size") {
      conflicting.push(entry);
    } else if (result.reviewReason === "no_price_size_pair_found") {
      if (anyAmountFound(disclosed)) {
        ambiguousSize.push(entry);
      } else {
        noPriceAtAll.push(entry);
      }
    }
  }

  console.log(`No price disclosed at all (nothing to review — will just show "price not listed"): ${noPriceAtAll.length}`);
  console.log(`Price found but size ambiguous (worth reviewing): ${ambiguousSize.length}`);
  console.log(`Conflicting prices at the same size (worth reviewing): ${conflicting.length}`);
  console.log(`Had a price contradiction already flagged in research (worth reviewing): ${contradictionFlagged.length}`);
  console.log(`Total genuinely worth human review: ${ambiguousSize.length + conflicting.length + contradictionFlagged.length}`);

  const outDir = path.join(__dirname, "..", "data");
  fs.writeFileSync(path.join(outDir, "price-no-data.json"), JSON.stringify(noPriceAtAll, null, 2));
  fs.writeFileSync(path.join(outDir, "price-ambiguous-size.json"), JSON.stringify(ambiguousSize, null, 2));
  fs.writeFileSync(path.join(outDir, "price-conflicting.json"), JSON.stringify(conflicting, null, 2));
  fs.writeFileSync(path.join(outDir, "price-contradiction-flagged.json"), JSON.stringify(contradictionFlagged, null, 2));

  // build a single CSV for the genuinely-worth-reviewing set, for easy spreadsheet review
  const forReview = [...ambiguousSize, ...conflicting, ...contradictionFlagged];
  const csvRows = [
    ["id", "brand", "product", "reason", "source_url"].join(","),
  ];
  for (const r of forReview) {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    csvRows.push([r.id, esc(r.brand), esc(r.product), r.reviewReason, esc(r.sourceUrl)].join(","));
  }
  fs.writeFileSync(path.join(outDir, "price-needs-review.csv"), csvRows.join("\n"));
  console.log(`\nWrote data/price-needs-review.csv (${forReview.length} rows) for spreadsheet review`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
