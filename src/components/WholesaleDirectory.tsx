"use client";

import Link from "@/i18n/Link";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/product-cards";
import {
  HOW_LABELS,
  SERVES_LABELS,
  TAG_HINTS,
  TAG_LABELS,
  TYPE_LABELS,
  type ProductType,
  type Serves,
  type SupplierView,
  type Tag,
} from "@/lib/suppliers";

const TAGS = Object.keys(TAG_LABELS) as Tag[];
const TYPES = Object.keys(TYPE_LABELS) as ProductType[];
const SERVES = Object.keys(SERVES_LABELS) as Serves[];
const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

// Filterable list of wholesale programs. Everything is rendered on the server too, so the full
// list is readable without JavaScript and by search engines.
//
// "Grown in" and the grade/organic options come from the products we list for the brands a
// supplier sells; "Ships to" is only set when the supplier's own wholesale page says so.
export function WholesaleDirectory({ suppliers, regionOrder }: { suppliers: SupplierView[]; regionOrder: string[] }) {
  const [tag, setTag] = useState<Tag | null>(null);
  const [region, setRegion] = useState("");
  const [serves, setServes] = useState<Serves | "">("");
  const [types, setTypes] = useState<ProductType[]>([]);
  const [q, setQ] = useState("");

  const regionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of suppliers) for (const r of s.regions) m.set(r, (m.get(r) ?? 0) + 1);
    return m;
  }, [suppliers]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (tag && !s.tags.includes(tag)) return false;
      if (region && !s.regions.includes(region)) return false;
      if (serves && !(s.serves ?? []).includes(serves)) return false;
      if (types.length && !types.every((t) => s.types.includes(t))) return false;
      if (!needle) return true;
      return [s.name, s.summary, ...s.brands, ...s.facts].some((t) => t.toLowerCase().includes(needle));
    });
  }, [suppliers, tag, region, serves, types, q]);

  const active = !!(tag || region || serves || types.length || q.trim());
  const clear = () => {
    setTag(null);
    setRegion("");
    setServes("");
    setTypes([]);
    setQ("");
  };

  const chip = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      on ? "border-matcha bg-matcha text-paper" : "border-line-strong bg-paper-raised text-ink hover:bg-matcha-soft"
    }`;
  const label = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";
  const select = "w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha";

  return (
    <div>
      <div className="rounded-sm border border-line bg-paper-raised p-4 sm:p-5">
        <div>
          <span className={label}>Program</span>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Program type">
            <button type="button" onClick={() => setTag(null)} aria-pressed={tag === null} className={chip(tag === null)}>
              All ({suppliers.length})
            </button>
            {TAGS.map((t) => (
              <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} title={TAG_HINTS[t]} className={chip(tag === t)}>
                {TAG_LABELS[t]} ({suppliers.filter((s) => s.tags.includes(t)).length})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="ws-region">Matcha grown in</label>
            <select id="ws-region" value={region} onChange={(e) => setRegion(e.target.value)} className={select}>
              <option value="">Any region</option>
              {regionOrder
                .filter((r) => regionCounts.get(r))
                .map((r) => (
                  <option key={r} value={r}>
                    {r === "Other" ? "Other regions" : r} ({regionCounts.get(r)})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ws-serves">Ships to (as stated)</label>
            <select id="ws-serves" value={serves} onChange={(e) => setServes(e.target.value as Serves | "")} className={select}>
              <option value="">Anywhere</option>
              {SERVES.map((c) => (
                <option key={c} value={c}>
                  {SERVES_LABELS[c]} ({suppliers.filter((s) => (s.serves ?? []).includes(c)).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <span className={label}>Products</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Product types">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                aria-pressed={types.includes(t)}
                className={chip(types.includes(t))}
              >
                {TYPE_LABELS[t]} ({suppliers.filter((s) => s.types.includes(t)).length})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="wholesale-search" className={label}>Search</label>
          <input
            id="wholesale-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Supplier or brand name, or a word like hojicha, pallet or private label"
            className="w-full max-w-md rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
          />
        </div>

        <p className="mt-4 text-xs text-ink-faint" aria-live="polite">
          Showing {shown.length} of {suppliers.length}
          {active && (
            <button type="button" onClick={clear} className="ml-3 underline hover:text-ink-muted">
              Clear filters
            </button>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          &ldquo;Matcha grown in&rdquo; and the product types come from the products we list for each supplier&apos;s brands. &ldquo;Ships to&rdquo; is
          shown only when the supplier&apos;s own wholesale page says so, so many suppliers have no entry there and appear under &ldquo;Anywhere&rdquo; only.
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {shown.map((s) => (
          <li key={s.slug} id={s.slug} className="scroll-mt-24 flex flex-col rounded-sm border border-line bg-paper-raised p-5">
            <div className="flex items-center gap-3">
              <BrandLogo brandName={s.name} size={44} maxWidth={132} />
              <h3 className="font-display text-xl font-semibold text-ink">{s.name}</h3>
            </div>
            {s.tags.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <span key={t} className="rounded-full border border-line-strong bg-paper px-2.5 py-0.5 text-xs text-ink-muted">
                    {TAG_LABELS[t]}
                  </span>
                ))}
              </p>
            )}
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">{s.summary}</p>
            {s.facts.length > 0 && (
              <ul className="mt-3 list-disc pl-5 flex flex-col gap-1 text-sm text-ink-muted">
                {s.facts.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            {s.facts.length > 4 && (
              <details className="mt-1 text-sm text-ink-muted">
                <summary className="cursor-pointer text-matcha hover:text-forest">{s.facts.length - 4} more</summary>
                <ul className="mt-1 list-disc pl-5 flex flex-col gap-1">
                  {s.facts.slice(4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </details>
            )}
            {(s.regions.length > 0 || s.types.length > 0) && (
              <p className="mt-3 text-xs text-ink-faint">
                {s.regions.length > 0 && <>Grown in: {s.regions.map((r) => (r === "Other" ? "other regions" : r)).join(", ")}. </>}
                {s.types.length > 0 && <>Products: {s.types.map((t) => TYPE_LABELS[t]).join(", ")}. </>}
                <span className="italic">From the products in our database.</span>
              </p>
            )}
            {(s.serves ?? []).length > 0 && <p className="mt-1 text-xs text-ink-faint">Ships to: {(s.serves ?? []).map((c) => SERVES_LABELS[c]).join(", ")}</p>}
            {s.how.length > 0 && <p className="mt-1 text-xs text-ink-faint">How to start: {s.how.map((h) => HOW_LABELS[h]).join(" · ")}</p>}
            {s.brands.length > 0 && (
              <p className="mt-2 text-xs text-ink-faint">
                In our database:{" "}
                {s.brands.map((b, i) => (
                  <span key={b}>
                    {i > 0 && ", "}
                    <Link href={`/brands/${encodeURIComponent(b)}`} className="underline hover:text-ink-muted">
                      {b}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            {s.note && <p className="mt-1 text-xs text-ink-faint">{s.note}</p>}
            <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-matcha px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-forest"
              >
                Wholesale page
                <span className="sr-only"> for {s.name} (opens in a new tab)</span>
                <span aria-hidden="true" className="ml-1">↗</span>
              </a>
              {s.profile && (
                <Link href={`/wholesale/${s.slug}`} className="text-sm text-matcha underline hover:text-forest">
                  Full profile
                </Link>
              )}
              <span className="text-xs text-ink-faint">Checked {dateFmt.format(new Date(`${s.verified}T00:00:00Z`))}</span>
            </div>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="mt-6 text-ink-muted">
          No suppliers match.{" "}
          <button type="button" onClick={clear} className="text-matcha underline hover:text-forest">
            Clear the filters
          </button>
          .
        </p>
      )}
    </div>
  );
}
