"use client";

import Link from "@/i18n/Link";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/product-cards";
import { useLang, useT, useTV } from "@/i18n/client";
import { INTL_LANG } from "@/i18n/config";
import {
  HOW_LABELS,
  SERVES_LABELS,
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

// Filterable list of wholesale programs. Everything is rendered on the server too, so the full
// list is readable without JavaScript and by search engines.
//
// "Grown in" and the grade/organic options come from the products we list for the brands a
// supplier sells; "Ships to" is only set when the supplier's own wholesale page says so.
export function WholesaleDirectory({ suppliers, regionOrder }: { suppliers: SupplierView[]; regionOrder: string[] }) {
  const t = useT();
  const tv = useTV();
  const lang = useLang();
  const dateFmt = new Intl.DateTimeFormat(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const sep = lang === "ja" || lang === "zh" ? "、" : ", ";
  const tagLabel = (x: Tag) => t(`c.ws.tag.${x}` as "c.ws.tag.bulk");
  const typeLabel = (x: ProductType) => t(`c.ws.type.${x}` as "c.ws.type.ceremonial");
  const servesLabel = (x: Serves) => t(`c.ws.serves.${x}` as "c.ws.serves.us");
  const howLabel = (x: keyof typeof HOW_LABELS) => t(`c.ws.how.${x}` as "c.ws.how.form");
  const regionLabel = (r: string) => (r === "Other" ? t("c.ws.otherRegionsLc") : tv("region", r));
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
      if (types.length && !types.every((ty) => s.types.includes(ty))) return false;
      if (!needle) return true;
      return [s.name, s.summary, ...s.brands, ...s.facts].some((x) => x.toLowerCase().includes(needle));
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
          <span className={label}>{t("c.ws.program")}</span>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("c.ws.programAria")}>
            <button type="button" onClick={() => setTag(null)} aria-pressed={tag === null} className={chip(tag === null)}>
              {t("c.ws.all", { n: suppliers.length })}
            </button>
            {TAGS.map((x) => (
              <button key={x} type="button" onClick={() => setTag(tag === x ? null : x)} aria-pressed={tag === x} title={t(`c.ws.hint.${x}` as "c.ws.hint.bulk")} className={chip(tag === x)}>
                {t("c.ws.chip", { label: tagLabel(x), n: suppliers.filter((s) => s.tags.includes(x)).length })}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="ws-region">{t("c.ws.grownIn")}</label>
            <select id="ws-region" value={region} onChange={(e) => setRegion(e.target.value)} className={select}>
              <option value="">{t("c.ws.anyRegion")}</option>
              {regionOrder
                .filter((r) => regionCounts.get(r))
                .map((r) => (
                  <option key={r} value={r}>
                    {r === "Other" ? t("c.ws.otherRegions") : tv("region", r)} ({regionCounts.get(r)})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ws-serves">{t("c.ws.shipsTo")}</label>
            <select id="ws-serves" value={serves} onChange={(e) => setServes(e.target.value as Serves | "")} className={select}>
              <option value="">{t("c.ws.anywhere")}</option>
              {SERVES.map((c) => (
                <option key={c} value={c}>
                  {servesLabel(c)} ({suppliers.filter((s) => (s.serves ?? []).includes(c)).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <span className={label}>{t("c.ws.products")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("c.ws.productsAria")}>
            {TYPES.map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => setTypes((cur) => (cur.includes(ty) ? cur.filter((x) => x !== ty) : [...cur, ty]))}
                aria-pressed={types.includes(ty)}
                className={chip(types.includes(ty))}
              >
                {t("c.ws.chip", { label: typeLabel(ty), n: suppliers.filter((s) => s.types.includes(ty)).length })}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="wholesale-search" className={label}>{t("c.ws.search")}</label>
          <input
            id="wholesale-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("c.ws.searchPh")}
            className="w-full max-w-md rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
          />
        </div>

        <p className="mt-4 text-xs text-ink-faint" aria-live="polite">
          {t("c.ws.showing", { n: shown.length, total: suppliers.length })}
          {active && (
            <button type="button" onClick={clear} className="ml-3 underline hover:text-ink-muted">
              {t("c.ws.clear")}
            </button>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {t("c.ws.filterNote")}
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
                {s.tags.map((x) => (
                  <span key={x} className="rounded-full border border-line-strong bg-paper px-2.5 py-0.5 text-xs text-ink-muted">
                    {tagLabel(x)}
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
                <summary className="cursor-pointer text-matcha hover:text-forest">{t("c.ws.more", { n: s.facts.length - 4 })}</summary>
                <ul className="mt-1 list-disc pl-5 flex flex-col gap-1">
                  {s.facts.slice(4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </details>
            )}
            {(s.regions.length > 0 || s.types.length > 0) && (
              <p className="mt-3 text-xs text-ink-faint">
                {s.regions.length > 0 && <>{t("c.ws.grownList", { list: s.regions.map(regionLabel).join(sep) })} </>}
                {s.types.length > 0 && <>{t("c.ws.typeList", { list: s.types.map(typeLabel).join(sep) })} </>}
                <span className="italic">{t("c.ws.fromDb")}</span>
              </p>
            )}
            {(s.serves ?? []).length > 0 && <p className="mt-1 text-xs text-ink-faint">{t("c.ws.shipsList", { list: (s.serves ?? []).map(servesLabel).join(sep) })}</p>}
            {s.how.length > 0 && <p className="mt-1 text-xs text-ink-faint">{t("c.ws.howList", { list: s.how.map(howLabel).join(" · ") })}</p>}
            {s.brands.length > 0 && (
              <p className="mt-2 text-xs text-ink-faint">
                {t("c.ws.inDb")}{" "}
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
                {t("c.ws.page")}
                <span className="sr-only">{t("c.ws.pageSr", { name: s.name })}</span>
                <span aria-hidden="true" className="ml-1">↗</span>
              </a>
              {s.profile && (
                <Link href={`/wholesale/${s.slug}`} className="text-sm text-matcha underline hover:text-forest">
                  {t("c.ws.profile")}
                </Link>
              )}
              <span className="text-xs text-ink-faint">{t("c.ws.checked", { date: dateFmt.format(new Date(`${s.verified}T00:00:00Z`)) })}</span>
            </div>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="mt-6 text-ink-muted">
          {t("c.ws.noMatch")}{" "}
          <button type="button" onClick={clear} className="text-matcha underline hover:text-forest">
            {t("c.ws.clearAll")}
          </button>
          .
        </p>
      )}
    </div>
  );
}
