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

  if (p.fx_converted === 1 && p.price_native != null && p.price_currency === "JPY") {
    text = `¥${trimNum(p.price_native)}${size} — ~$${p.price_usd.toFixed(2)} USD (converted${
      p.fx_rate_date ? `, rate as of ${p.fx_rate_date}` : ""
    })`;
  }

  return { kind: "resolved", text, caution: p.price_needs_review === 1 };
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
