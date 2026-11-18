"use client";

import Link from "@/i18n/Link";
import { useT } from "@/i18n/client";
import { COMPARE_MAX, useCompare } from "@/components/CompareProvider";

// The compare queue on the right-hand side of the screen. It appears once a product has been added, and shows a Compare button from the second one on.
export function CompareTray() {
  const t = useT();
  const { items, remove, clear } = useCompare();
  if (items.length === 0) return null;
  return (
    <aside
      aria-label={t("c.cmpp.tray.title", { n: items.length, max: COMPARE_MAX })}
      className="fixed bottom-4 right-4 z-30 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-line-strong bg-paper-raised p-3 shadow-lg sm:bottom-auto sm:top-1/3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-forest">{t("c.cmpp.tray.title", { n: items.length, max: COMPARE_MAX })}</p>
        <button type="button" onClick={clear} className="text-xs text-ink-faint underline hover:text-ink-muted">
          {t("c.cmpp.tray.clear")}
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-2 rounded-sm bg-paper px-2.5 py-1.5">
            <Link href={`/products/${it.id}`} className="min-w-0 text-sm leading-snug text-ink hover:text-matcha">
              <span className="block truncate font-medium">{it.name}</span>
              <span className="block truncate text-xs text-ink-faint">{it.brand}</span>
            </Link>
            <button type="button" onClick={() => remove(it.id)} aria-label={t("c.cmpp.remove")} className="mt-0.5 text-ink-faint hover:text-ink">
              ×
            </button>
          </li>
        ))}
      </ul>
      {items.length >= 2 ? (
        <Link
          href={`/compare/products?ids=${items.map((i) => i.id).join(",")}`}
          className="mt-3 block rounded-full bg-matcha py-2 text-center text-sm font-medium text-paper transition-colors hover:bg-forest"
        >
          {t("c.cmpp.tray.go")}
        </Link>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">{t("c.cmpp.tray.hint")}</p>
      )}
    </aside>
  );
}
