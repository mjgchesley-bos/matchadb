"use client";

import { useT } from "@/i18n/client";
import { COMPARE_MAX, useCompare } from "@/components/CompareProvider";

// "Add to compare" on a product page: puts the product in the compare queue on the right-hand side.
export function CompareButton({ productId, productName, brand }: { productId: number; productName: string; brand: string }) {
  const t = useT();
  const { items, has, toggle } = useCompare();
  const inList = has(productId);
  const full = !inList && items.length >= COMPARE_MAX;
  return (
    <button
      type="button"
      onClick={() => toggle({ id: productId, name: productName, brand })}
      disabled={full}
      aria-pressed={inList}
      title={full ? t("c.cmpp.tray.full") : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${inList ? "border-matcha bg-matcha-soft text-ink" : "border-line-strong bg-paper-raised text-ink hover:border-matcha hover:bg-matcha-soft"}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {inList ? <path d="M3 8.5l3.2 3L13 4.5" /> : <path d="M8 3v10M3 8h10" />}
      </svg>
      {inList ? t("c.cmpp.remove") : t("c.cmpp.add")}
    </button>
  );
}
