import type { ProductPriceRow, ProductRow } from "./db";

// Cutoffs are the real 33rd/66th percentile of price_per_gram across the 427
// products that have one (checked directly against the database, not
// guessed round numbers) -- splits the priced catalog into roughly even
// thirds rather than arbitrary "cheap"/"expensive" bands.
export const PRICE_TIER_CHEAP_MAX = 0.7;
export const PRICE_TIER_MID_MAX = 1.4;

export type PriceTier = "cheap" | "mid" | "premium";

export function getPriceTier(pricePerGram: number | null): PriceTier | null {
  if (pricePerGram == null) return null;
  if (pricePerGram <= PRICE_TIER_CHEAP_MAX) return "cheap";
  if (pricePerGram <= PRICE_TIER_MID_MAX) return "mid";
  return "premium";
}

export type PriceDisplay =
  | { kind: "resolved"; text: string; caution: boolean }
  | { kind: "linkOnly" }
  | { kind: "unresolved" };

export function formatPrice(p: ProductRow): PriceDisplay {
  // A real price is confirmed to exist (curated in
  // data/price-display-overrides.json), just not in a packaging format
  // (stick counts, tea-bag counts) that reduces to a comparable per-gram
  // figure -- distinct from genuinely having no price data at all. Checked
  // before price_usd so the flag always wins, even if some other resolution
  // path ever produces a number for this product.
  if (p.price_link_only === 1) {
    return { kind: "linkOnly" };
  }
  if (p.price_usd == null) {
    return { kind: "unresolved" };
  }

  const size = p.price_size_grams != null ? ` (${trimNum(p.price_size_grams)}g)` : "";
  let text = `$${p.price_usd.toFixed(2)}${size}`;

  if (p.fx_converted === 1 && p.price_native != null) {
    const symbol =
      p.price_currency === "JPY" ? "¥" : p.price_currency === "GBP" ? "£" : p.price_currency === "EUR" ? "€" : "";
    const nativeAmount = p.price_currency === "JPY" ? trimNum(p.price_native) : p.price_native.toFixed(2);
    text = `${symbol}${nativeAmount}${size} — ~$${p.price_usd.toFixed(2)} USD (converted${
      p.fx_rate_date ? `, rate as of ${p.fx_rate_date}` : ""
    })`;
  }

  return { kind: "resolved", text, caution: p.price_needs_review === 1 };
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function currencySymbol(currency: string): string {
  return currency === "JPY" ? "¥" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
}

// One row of the full "every size actually disclosed" pricing table shown
// on the product detail page — as opposed to formatPrice's single collapsed
// "from $X" figure used on browse/brand list pages.
export function formatPriceVariant(
  v: ProductPriceRow & { allAmounts: number[] }
): { text: string; caution: boolean } {
  const size = `${trimNum(v.size_grams)}g`;
  const symbol = currencySymbol(v.price_currency);

  if (v.needs_review === 1 || v.price_native == null) {
    const amounts = v.allAmounts
      .map((a) => `${symbol}${v.price_currency === "JPY" ? trimNum(a) : a.toFixed(2)}`)
      .join(" or ");
    return { text: `${size} — ${amounts} (multiple prices listed on the page; unclear which is current)`, caution: true };
  }

  const nativeAmount = v.price_currency === "JPY" ? trimNum(v.price_native) : v.price_native.toFixed(2);
  let text = `${size} — ${symbol}${nativeAmount}`;
  if (v.fx_converted === 1 && v.price_usd != null) {
    text += ` (~$${v.price_usd.toFixed(2)} USD${v.fx_rate_date ? `, rate as of ${v.fx_rate_date}` : ""})`;
  }
  if (v.inferred === 1) {
    text += " (size inferred from the page's listed option — not explicitly stated for this price)";
    return { text, caution: true };
  }
  return { text, caution: false };
}
