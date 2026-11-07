import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "@/i18n/Link";
import {
  getStats,
  getProducts,
  getFilterOptions,
  getTieredPicks,
  getPopularProducts,
  getProductsByIds,
  POPULAR_BRANDS,
  type BrowseFilters,
} from "@/lib/db";
import { toArr, toStr } from "@/lib/searchParams";
import { resolveShipsTo } from "@/lib/shipping";
import { BrandLogo } from "@/components/product-cards";
import { ProductCard, TieredPickCard } from "@/components/ProductCard";
import { MatchTool } from "@/components/MatchTool";
import { PopularRail } from "@/components/PopularRail";
import { getCommunityPopularIds } from "@/lib/popular";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { getLibraryFacets } from "@/lib/studies";
import { GUIDES } from "@/lib/guides";
import { getT } from "@/i18n/server";
import { isLocale, fmtNum, localePath, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";

// Abbreviated relative to /browse's full result set + pagination -- the home
// page shows a sample plus a link to the full database rather than paging.
const HOME_PAGE_SIZE = 12;
// How many products the "Popular right now" column shows.
const RAIL_SIZE = 4;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: pageAlternates(isLocale(lang) ? lang : "en", "/") };
}

export default async function Home({
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
  const { brandCount, productCount, retailerCount } = await getStats();

  // Home is a matching tool, not a database search -- only grade/use/flavor
  // are exposed here. Search, brand, region, price, and the QA-flag
  // checkboxes are database-search concerns that live on /browse.
  const filters: BrowseFilters = {
    grades: toArr(sp.grade),
    flavors: toArr(sp.flavor),
    uses: toArr(sp.use),
    // Only applied when the visitor picks a region; by default nothing is hidden.
    shipsTo: resolveShipsTo(toStr(sp.ships)),
    page: 1,
    pageSize: HOME_PAGE_SIZE,
  };

  // Before any selection, an alphabetical sample just surfaces whatever
  // brand starts with "A" -- swap in a curated round-robin of popular
  // brands instead. Once a filter is applied, that curation doesn't apply
  // (the visitor is now asking a specific question), so fall back to the
  // normal filtered/alphabetical result set.
  const noFiltersSelected =
    filters.grades!.length === 0 && filters.flavors!.length === 0 && filters.uses!.length === 0;

  const [{ products: defaultProducts, total }, filterOptions, tieredPicks, popularPool, communityIds] = await Promise.all([
    getProducts(filters),
    getFilterOptions(),
    getTieredPicks(filters),
    // A few extra beyond the grid, to top up the "Popular right now" column.
    noFiltersSelected ? getPopularProducts(HOME_PAGE_SIZE + RAIL_SIZE, filters.shipsTo) : Promise.resolve(null),
    noFiltersSelected ? getCommunityPopularIds() : Promise.resolve([] as number[]),
  ]);
  const products = popularPool ? popularPool.slice(0, HOME_PAGE_SIZE) : defaultProducts;

  // "Popular right now": member favorites first, then well-known staples to fill the column. Only on
  // the unfiltered home view; once someone filters, the results get the full width.
  let rail: { products: typeof products; fromMembers: number } | null = null;
  if (popularPool) {
    const community = (await getProductsByIds(communityIds.slice(0, RAIL_SIZE * 2), filters.shipsTo)).slice(0, RAIL_SIZE);
    const seen = new Set(community.map((p) => p.id));
    const fill = popularPool.slice(HOME_PAGE_SIZE).filter((p) => !seen.has(p.id));
    const railProducts = [...community, ...fill].slice(0, RAIL_SIZE);
    if (railProducts.length > 0) rail = { products: railProducts, fromMembers: community.length };
  }

  const seeAllParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (!v) continue;
    for (const item of Array.isArray(v) ? v : [v]) seeAllParams.append(k, item);
  }
  const seeAllHref = seeAllParams.toString() ? `/browse?${seeAllParams.toString()}` : "/browse";

  const stats = [
    { value: n(productCount), label: t("h.stats.products") },
    { value: n(brandCount), label: t("h.stats.brands") },
    { value: n(retailerCount), label: t("h.stats.retailers") },
  ];


  const photoStrip = [
    {
      label: "harvest",
      src: "/images/strip-the-harvest.jpg",
      alt: t("h.photo.harvest"),
    },
    {
      label: "afternoon",
      src: "/images/strip-the-afternoon-break.jpg",
      alt: t("h.photo.afternoon"),
    },
    {
      label: "ingredient",
      src: "/images/strip-the-ingredient.jpg",
      alt: t("h.photo.ingredient"),
    },
  ];

  return (
    <main className="flex-1">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/browse?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-10 sm:pt-24 text-center">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-6">
            {t("h.hero.eyebrow")}
          </p>
          <h1 className="font-display text-[2.75rem] leading-[1.05] sm:text-[4.25rem] sm:leading-[1.02] font-semibold tracking-tight text-ink text-balance">
            {t("h.hero.title")}
          </h1>
          <p className="mt-7 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            {t("h.hero.lede", { products: n(productCount), brands: n(brandCount) })}
          </p>
        </div>
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {photoStrip.map((item, i) => (
              <div key={item.label} className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-line">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-matcha">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl sm:text-5xl font-semibold text-paper tabular-nums">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-paper/75">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pt-14 pb-2 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-8">{t("h.brands.title")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-8 items-start">
          {POPULAR_BRANDS.map((b) => (
            <Link
              key={b}
              href={`/brands/${encodeURIComponent(b)}`}
              className="group flex flex-col items-center gap-3 p-3 rounded-sm"
            >
              <span className="transition-transform group-hover:-translate-y-0.5">
                <BrandLogo brandName={b} size={88} maxWidth={150} allowTallerThanSize plain logoAlt={t("pc.logoAlt", { brand: b })} />
              </span>
              <span className="text-sm text-ink-muted text-center leading-snug group-hover:text-ink transition-colors">
                {b}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${rail ? "max-w-[88rem]" : "max-w-7xl"} mx-auto px-6 pt-12 pb-16`}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <aside className="lg:w-72 lg:shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <p className="font-mono text-sm tracking-[0.2em] uppercase text-forest mb-6">{t("h.match.eyebrow")}</p>
            <MatchTool filters={filters} options={filterOptions} clearHref="/" compact />
          </aside>

          <div className="min-w-0 flex-1">
            {rail && (
              <div className="mb-8 xl:hidden">
                <PopularRail products={rail.products} fromMembers={rail.fromMembers} layout="strip" lang={lang} />
              </div>
            )}
            {tieredPicks && !noFiltersSelected && (
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

            <p className="text-sm text-ink-muted mb-5">
              {t(total === 1 ? "list.showing.one" : "list.showing.other", { shown: n(products.length), total: n(total) })}
            </p>

            {products.length > 0 ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${rail ? "" : "xl:grid-cols-3"} gap-4`}>
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} lang={lang} />
                ))}
              </div>
            ) : (
              <p className="text-ink-muted">{t("h.empty")}</p>
            )}

            {total > products.length && (
              <div className="mt-8 text-center">
                <Link
                  href={seeAllHref}
                  className="group inline-flex items-center gap-2 text-matcha hover:text-forest font-medium transition-colors"
                >
                  {t("h.seeAll", { total: n(total) })}
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            )}
          </div>

          {rail && (
            <aside className="hidden xl:block xl:w-64 xl:shrink-0 xl:sticky xl:top-24">
              <PopularRail products={rail.products} fromMembers={rail.fromMembers} layout="column" lang={lang} />
            </aside>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">{t("h.guides.title")}</h2>
          <Link href="/guides" className="text-matcha hover:text-forest text-sm whitespace-nowrap">
            {t("h.guides.all")} &rarr;
          </Link>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="rounded-full border-2 border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
            >
              {g.h1}
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="border border-line rounded-sm bg-paper-raised p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("h.research.eyebrow")}</p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink text-balance">
            {t("h.research.title")}
          </h2>
          <p className="mt-3 text-ink-muted max-w-2xl leading-relaxed">
            {t("h.research.body", { count: n(getLibraryFacets(false).total) })}
          </p>
          <form action={localePath(lang, "/research")} method="get" className="mt-5 flex gap-2 max-w-2xl">
            <input
              name="q"
              type="search"
              aria-label={t("h.research.searchLabel")}
              placeholder={t("h.research.placeholder")}
              className="flex-1 min-w-0 border border-line-strong rounded-full px-5 py-3 bg-paper text-base text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha transition-colors"
            />
            <button type="submit" className="rounded-full bg-matcha text-paper px-6 py-3 text-sm font-medium tracking-wide hover:bg-forest transition-colors shrink-0">
              {t("h.research.button")}
            </button>
          </form>
          <Link href="/research" className="inline-block mt-4 text-matcha hover:text-forest">
            {t("h.research.browse")} &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}
