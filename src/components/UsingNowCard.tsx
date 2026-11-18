"use client";

import Link from "@/i18n/Link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/product-cards";
import { useT } from "@/i18n/client";

// The "Using now" spot at the far right of My matcha: the one matcha you are using right now. Everything else goes on the shelf.
export type UsingItem = { id: number; brand: string; name: string; price: string | null };
type Choice = { id: number; brand: string; name: string };

export function UsingNowCard({ current, shelfChoices, onSet, onClear }: { current: UsingItem | null; shelfChoices: Choice[]; onSet: (c: Choice) => Promise<void>; onClear: () => Promise<void> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Choice[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) { setFound([]); return; }
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(v)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { products?: Choice[] } | null) => setFound(j?.products ?? []))
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);

  const pick = async (c: Choice) => {
    setBusy(true);
    await onSet(c);
    setBusy(false);
    setOpen(false);
    setQ("");
  };

  return (
    <section aria-labelledby="using-now-h" className="w-full shrink-0 rounded-sm border-2 border-matcha bg-matcha-soft p-4 sm:w-64 lg:ml-auto">
      <h2 id="using-now-h" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{t("c.mp.using")}</h2>
      {current ? (
        <div className="mt-3 flex flex-col items-start gap-2">
          <BrandLogo brandName={current.brand} size={44} maxWidth={120} />
          <Link href={`/products/${current.id}`} className="block text-ink hover:text-matcha">
            <span className="block text-xs text-ink-faint">{current.brand}</span>
            <span className="font-display text-lg font-semibold leading-snug">{current.name}</span>
          </Link>
          {current.price && <span className="text-sm tabular-nums text-ink-muted">{current.price}</span>}
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-matcha underline hover:text-forest">{t("c.mp.usingChange")}</button>
            <button type="button" disabled={busy} onClick={() => { setBusy(true); void onClear().finally(() => setBusy(false)); }} className="text-ink-muted underline hover:text-ink disabled:opacity-60">{t("c.mp.usingRemove")}</button>
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-ink-muted">{t("c.mp.usingEmpty")}</p>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 rounded-full bg-matcha px-4 py-1.5 text-sm font-medium text-paper hover:bg-forest">{t("c.mp.usingChoose")}</button>
        </div>
      )}

      {open && (
        <div className="mt-4 border-t border-line pt-3">
          <label htmlFor="using-q" className="sr-only">{t("c.mp.usingSearch")}</label>
          <input id="using-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("c.mp.usingSearch")} autoComplete="off" className="w-full rounded-sm border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink focus:border-matcha focus:outline-none" />
          {found.length > 0 ? (
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {found.map((c) => (
                <li key={c.id}>
                  <button type="button" disabled={busy} onClick={() => void pick(c)} className="block w-full px-2 py-1.5 text-left text-sm text-ink hover:bg-paper disabled:opacity-60">
                    {c.name} <span className="text-ink-faint">· {c.brand}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            shelfChoices.length > 0 && q.trim().length < 2 && (
              <div className="mt-2">
                <p className="text-xs text-ink-faint">{t("c.mp.usingFromShelf")}</p>
                <ul className="mt-1 max-h-48 overflow-y-auto">
                  {shelfChoices.slice(0, 8).map((c) => (
                    <li key={c.id}>
                      <button type="button" disabled={busy} onClick={() => void pick(c)} className="block w-full px-2 py-1.5 text-left text-sm text-ink hover:bg-paper disabled:opacity-60">
                        {c.name} <span className="text-ink-faint">· {c.brand}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
