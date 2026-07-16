import type { ProductRow } from "./db";

export type PriceDisplay =
  | { kind: "resolved"; text: string; caution: boolean }
  | { kind: "unresolved" };

export function formatPrice(p: ProductRow): PriceDisplay {
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
