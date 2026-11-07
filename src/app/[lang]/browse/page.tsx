import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/i18n/Link";
import { getProducts, getFilterOptions, getTieredPicks, getHiddenMatches, type BrowseFilters } from "@/lib/db";
import { resolveShipsTo } from "@/lib/shipping";
import { shipRegionLabel } from "@/components/ShippingNote";
import { getT } from "@/i18n/server";
import { isLocale, fmtNum, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { toStr, toArr, toNum } from "@/lib/searchParams";
import { ProductCard, TieredPickCard } from "@/components/ProductCard";
import { FilterForm } from "@/components/FilterForm";

// The full search experience: every filter, the largest page size on the
// site. The home page embeds the same filter form but shows fewer results
// and links here for the rest.
const PAGE_SIZE = 48;

// Canonical always points at the bare, unfiltered URL -- filter/search query
// strings produce near-duplicate content (the same 728 products re-sliced),
// which would otherwise dilute this page's ranking across dozens of indexed
// variants instead of consolidating it on one authoritative URL.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return {
    title: t("b.meta.title"),
    description: t("b.meta.description"),
    alternates: pageAlternates(lang, "/browse"),
  };
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang: rawLang } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const t = getT(lang);
  const n = (x: number) => fmtNum(lang, x);
  const sp = await searchParams;

  const filters: BrowseFilters = {
    q: toStr(sp.q),
    brand: toStr(sp.brand),
    grades: toArr(sp.grade),
    region: toStr(sp.region),
    flavors: toArr(sp.flavor),
    uses: toArr(sp.use),
    organicOnly: toStr(sp.organicOnly) === "1",
    hasContradictionsOnly: toStr(sp.hasContradictionsOnly) === "1",
    wholesaleOnly: toStr(sp.wholesaleOnly) === "1",
    minPrice: toNum(sp.minPrice),
    maxPrice: toNum(sp.maxPrice),
    shipsTo: resolveShipsTo(toStr(sp.ships)),
    page: toNum(sp.page) || 1,
    pageSize: PAGE_SIZE,
  };

  const [{ products, total, page, totalPages }, filterOptions, tieredPicks, hiddenByShipping] = await Promise.all([
    getProducts(filters),
    getFilterOptions(),
    getTieredPicks(filters),
    filters.shipsTo ? getHiddenMatches(filters) : Promise.resolve({ count: 0, brands: [] as string[] }),
  ]);
  const hiddenCount = hiddenByShipping.count;
  const hiddenBrands = hiddenByShipping.brands;
  const brandList = hiddenBrands.length <= 3 ? hiddenBrands.join(", ") : t("b.brandsMore", { names: hiddenBrands.slice(0, 3).join(", "), n: hiddenBrands.length - 3 });
  const region = filters.shipsTo ? shipRegionLabel(filters.shipsTo, lang) : "";
  const plural = hiddenCount === 1 ? "one" : "other";
  const showAllHref = (() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || k === "ships" || !v) continue;
      for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
    }
    params.set("ships", "any");
    return `/browse?${params.toString()}`;
  })();

  function pageHref(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || !v) continue;
      for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
    }
    params.set("page", String(p));
    return `/browse?${params.toString()}`;
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("b.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
          {t("b.h1")}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10">
        <aside className="md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:overscroll-contain md:pr-2">
          <FilterForm filters={filters} options={filterOptions} clearHref="/browse" lang={lang} />
        </aside>

        <section>
          {tieredPicks && (
            <div className="mb-10">
              <p className="font-mono text-sm tracking-[0.2em] uppercase text-forest mb-4">
                {t("pick.eyebrow")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TieredPickCard label={t("pick.budget")} product={tieredPicks.cheap} lang={lang} />
                <TieredPickCard label={t("pick.mid")} product={tieredPicks.mid} lang={lang} />
                <TieredPickCard label={t("pick.premium")} product={tieredPicks.premium} lang={lang} />
              </div>
            </div>
          )}

          <p className="text-sm text-ink-muted mb-2">
            {t(total === 1 ? "b.found.one" : "b.found.other", { total: n(total) })}
          </p>
          {filters.shipsTo && hiddenCount > 0 && total === 0 && (
            <div className="mb-5 rounded-sm border border-line-strong bg-gold-soft px-4 py-3 text-sm text-ink-muted" role="status">
              <p className="font-medium text-ink">
                {t(`b.hidden.title.${plural}`, { count: n(hiddenCount), brands: brandList, region })}
              </p>
              <p className="mt-1">
                {t(`b.hidden.body.${plural}`, { region })}{" "}
                <Link href={showAllHref} className="text-matcha hover:text-forest underline">
                  {t(`b.hidden.showAnyway.${plural}`)}
                </Link>
              </p>
            </div>
          )}
          {filters.shipsTo && hiddenCount > 0 && total > 0 && (
            <p className="text-xs text-ink-faint mb-5">
              {t(`b.hidden.inline.${plural}`, { region, count: n(hiddenCount), brands: brandList })}{" "}
              <Link href={showAllHref} className="text-matcha hover:text-forest underline">
                {t("b.hidden.showAll")}
              </Link>
            </p>
          )}
          {!(filters.shipsTo && hiddenCount > 0) && <div className="mb-3" />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>

          {products.length === 0 && hiddenCount === 0 && (
            <p className="text-ink-muted mt-8">{t("h.empty")}</p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10 text-sm">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="text-ink-muted hover:text-ink transition-colors">
                  &larr; {t("b.prev")}
                </Link>
              )}
              <span className="text-ink-faint font-mono">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="text-ink-muted hover:text-ink transition-colors">
                  {t("b.next")} &rarr;
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
