"use client";

import Link from "@/i18n/Link";
import { useT } from "@/i18n/client";
import { SHELF_KEYS, type ShelfStatus } from "@/components/ShelfButtons";

// A wooden shelf: product cards stand in rows of three, each row on its own plank.
export type ShelfCard = { id: number; brand: string; name: string; price: string | null; tag: ShelfStatus | "saved"; onRemove: () => void };

const wood = {
  background: "linear-gradient(180deg, #b98a57 0%, #a37444 45%, #8a5f35 100%)",
  boxShadow: "0 6px 8px -4px rgba(60,35,10,.45), inset 0 1px 0 rgba(255,255,255,.25)",
};

export function WoodShelf({ cards }: { cards: ShelfCard[] }) {
  const t = useT();
  const rows: ShelfCard[][] = [];
  for (let i = 0; i < cards.length; i += 3) rows.push(cards.slice(i, i + 3));
  while (rows.length < 2) rows.push([]); // always at least two planks
  return (
    <div className="rounded-sm border border-[#6e4a26] bg-[#d9c3a0]/40 p-3 dark:bg-[#3a2c1c]/60">
      {rows.map((row, ri) => (
        <div key={ri} className="mb-1 last:mb-0">
          <ul className="grid min-h-40 grid-cols-3 items-end gap-2 px-1">
            {row.map((c) => (
              <li key={`${c.tag}-${c.id}`} className="flex flex-col rounded-sm border border-line bg-paper-raised p-2.5 text-xs shadow-sm">
                <span className="truncate text-ink-faint">{c.brand}</span>
                <Link href={`/products/${c.id}`} className="line-clamp-3 font-medium leading-snug text-ink hover:text-matcha">{c.name}</Link>
                {c.tag !== "want" && <span className="mt-1.5 inline-flex w-fit rounded-full bg-matcha-soft px-2 py-0.5 text-[11px] text-forest">{c.tag === "saved" ? t("c.mp.shelfSaved") : t(SHELF_KEYS[c.tag])}</span>}
                <span className="mt-auto flex items-center justify-between pt-2 tabular-nums text-ink-muted">
                  <span>{c.price}</span>
                  <button type="button" onClick={c.onRemove} className="underline hover:text-ink">{t("c.acct.remove")}</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="h-3.5 rounded-[2px]" style={wood} aria-hidden="true" />
        </div>
      ))}
      {cards.length === 0 && <p className="mt-2 px-1 text-sm text-ink-muted">{t("c.mp.shelfEmpty")}</p>}
    </div>
  );
}
