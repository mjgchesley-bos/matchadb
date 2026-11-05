"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HOW_LABELS, TAG_HINTS, TAG_LABELS, type Supplier, type Tag } from "@/lib/suppliers";

const TAGS = Object.keys(TAG_LABELS) as Tag[];
const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

// Filterable list of wholesale programs. Everything is rendered on the server too, so the full
// list is readable without JavaScript and by search engines.
export function WholesaleDirectory({ suppliers }: { suppliers: Supplier[] }) {
  const [tag, setTag] = useState<Tag | null>(null);
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (tag && !s.tags.includes(tag)) return false;
      if (!needle) return true;
      return [s.name, s.summary, ...s.brands, ...s.facts].some((t) => t.toLowerCase().includes(needle));
    });
  }, [suppliers, tag, q]);

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active ? "border-matcha bg-matcha text-paper" : "border-line-strong bg-paper-raised text-ink hover:bg-matcha-soft"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter suppliers">
        <button type="button" onClick={() => setTag(null)} aria-pressed={tag === null} className={chip(tag === null)}>
          All ({suppliers.length})
        </button>
        {TAGS.map((t) => (
          <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} title={TAG_HINTS[t]} className={chip(tag === t)}>
            {TAG_LABELS[t]} ({suppliers.filter((s) => s.tags.includes(t)).length})
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label htmlFor="wholesale-search" className="sr-only">
          Search wholesale suppliers
        </label>
        <input
          id="wholesale-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by supplier or brand, for example Uji, organic or Faire"
          className="w-full max-w-md rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
        />
        <p className="mt-2 text-xs text-ink-faint" aria-live="polite">
          Showing {shown.length} of {suppliers.length}
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {shown.map((s) => (
          <li key={s.slug} id={s.slug} className="scroll-mt-24 flex flex-col rounded-sm border border-line bg-paper-raised p-5">
            <h3 className="font-display text-xl font-semibold text-ink">{s.name}</h3>
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
            {s.how.length > 0 && <p className="mt-3 text-xs text-ink-faint">How to start: {s.how.map((h) => HOW_LABELS[h]).join(" · ")}</p>}
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
      {shown.length === 0 && <p className="mt-6 text-ink-muted">No suppliers match. Clear the search or pick &ldquo;All&rdquo;.</p>}
    </div>
  );
}
