import type { Metadata } from "next";
import Link from "next/link";
import { getProducts, getFilterOptions, getTieredPicks, type BrowseFilters } from "@/lib/db";
import { toStr, toArr, toNum } from "@/lib/searchParams";
import { ProductCard, TieredPickCard } from "@/components/product-cards";
import { FilterForm } from "@/components/FilterForm";
import { SITE_URL } from "@/lib/site";

// The full search experience: every filter, the largest page size on the
// site. The home page embeds the same filter form but shows fewer results
// and links here for the rest.
const PAGE_SIZE = 48;

// Canonical always points at the bare, unfiltered URL -- filter/search query
// strings produce near-duplicate content (the same 728 products re-sliced),
// which would otherwise dilute this page's ranking across dozens of indexed
// variants instead of consolidating it on one authoritative URL.
export const metadata: Metadata = {
  title: "Search the Matcha Database",
  description:
    "Filter and compare matcha products by brand, grade, region, cultivar, flavor, and price per gram — full database search across every product MatchaDB has researched.",
  alternates: { canonical: `${SITE_URL}/browse` },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
    minPrice: toNum(sp.minPrice),
    maxPrice: toNum(sp.maxPrice),
    page: toNum(sp.page) || 1,
    pageSize: PAGE_SIZE,
  };

  const [{ products, total, page, totalPages }, filterOptions, tieredPicks] = await Promise.all([
    getProducts(filters),
    getFilterOptions(),
    getTieredPicks(filters),
  ]);

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
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Catalog</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
          Browse every product
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10">
        <aside className="md:sticky md:top-24 h-fit">
          <FilterForm filters={filters} options={filterOptions} clearHref="/browse" />
        </aside>

        <section>
          {tieredPicks && (
            <div className="mb-10">
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-4">
                A pick at every price
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TieredPickCard label="Budget pick" product={tieredPicks.cheap} />
                <TieredPickCard label="Mid-range pick" product={tieredPicks.mid} />
                <TieredPickCard label="Premium pick" product={tieredPicks.premium} />
              </div>
            </div>
          )}

          <p className="text-sm text-ink-muted mb-5">
            {total.toLocaleString()} product{total === 1 ? "" : "s"} found
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {products.length === 0 && (
            <p className="text-ink-muted mt-8">No products match those filters.</p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10 text-sm">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="text-ink-muted hover:text-ink transition-colors">
                  &larr; Previous
                </Link>
              )}
              <span className="text-ink-faint font-mono">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="text-ink-muted hover:text-ink transition-colors">
                  Next &rarr;
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
