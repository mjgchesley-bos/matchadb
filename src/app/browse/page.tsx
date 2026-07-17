import Link from "next/link";
import { getProducts, getFilterOptions, type BrowseFilters } from "@/lib/db";
import { formatPrice } from "@/lib/price";

function toStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toNum(v: string | string[] | undefined): number | undefined {
  const s = toStr(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters: BrowseFilters = {
    q: toStr(sp.q),
    brand: toStr(sp.brand),
    grade: toStr(sp.grade),
    region: toStr(sp.region),
    organicOnly: toStr(sp.organicOnly) === "1",
    hasContradictionsOnly: toStr(sp.hasContradictionsOnly) === "1",
    minPrice: toNum(sp.minPrice),
    maxPrice: toNum(sp.maxPrice),
    page: toNum(sp.page) || 1,
    pageSize: 24,
  };

  const [{ products, total, page, totalPages }, { brands, grades, regions }] = await Promise.all([
    getProducts(filters),
    getFilterOptions(),
  ]);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || !v) continue;
      params.set(k, Array.isArray(v) ? v[0] : v);
    }
    params.set("page", String(p));
    return `/browse?${params.toString()}`;
  }

  return (
    <main className="flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-6 max-w-6xl mx-auto w-full">
      <aside className="md:sticky md:top-6 h-fit">
        <form method="get" className="flex flex-col gap-4 text-sm">
          <div>
            <label className="block font-medium mb-1" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Brand or product name"
              className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 bg-transparent"
            />
          </div>

          <div>
            <label className="block font-medium mb-1" htmlFor="brand">
              Brand
            </label>
            <select
              id="brand"
              name="brand"
              defaultValue={filters.brand || ""}
              className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1" htmlFor="grade">
              Grade
            </label>
            <select
              id="grade"
              name="grade"
              defaultValue={filters.grade || ""}
              className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">Any grade</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1" htmlFor="region">
              Region
            </label>
            <select
              id="region"
              name="region"
              defaultValue={filters.region || ""}
              className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">Any region</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block font-medium mb-1" htmlFor="minPrice">
                Min $
              </label>
              <input
                id="minPrice"
                name="minPrice"
                type="number"
                step="0.01"
                defaultValue={filters.minPrice}
                className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 bg-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1" htmlFor="maxPrice">
                Max $
              </label>
              <input
                id="maxPrice"
                name="maxPrice"
                type="number"
                step="0.01"
                defaultValue={filters.maxPrice}
                className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 bg-transparent"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="organicOnly"
              value="1"
              defaultChecked={filters.organicOnly}
            />
            Organic-certified only
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="hasContradictionsOnly"
              value="1"
              defaultChecked={filters.hasContradictionsOnly}
            />
            Flag: has contradictions
          </label>

          <button
            type="submit"
            className="rounded bg-green-700 hover:bg-green-800 text-white py-2 font-medium"
          >
            Apply filters
          </button>
          <Link href="/browse" className="text-center text-neutral-500 hover:underline">
            Clear all
          </Link>
        </form>
      </aside>

      <section>
        <p className="text-sm text-neutral-500 mb-4">
          {total.toLocaleString()} product{total === 1 ? "" : "s"} found
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 hover:border-green-600 transition-colors flex flex-col gap-1"
            >
              <span className="text-xs uppercase tracking-wide text-neutral-500">
                {p.brand_name}
              </span>
              <span className="font-medium">{p.product_name}</span>
              <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                {p.grade && (
                  <span className="rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5">
                    {p.grade}
                  </span>
                )}
                {p.region && (
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
                    {p.region}
                  </span>
                )}
                {p.organic_certified === 1 && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5">
                    Organic
                  </span>
                )}
                {p.has_contradictions === 1 && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5">
                    ⚠ flagged
                  </span>
                )}
                {p.not_found === 1 && (
                  <span className="rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5">
                    unverifiable
                  </span>
                )}
              </div>
              {(() => {
                const price = formatPrice(p);
                if (price.kind === "unresolved") {
                  return (
                    <span className="text-sm mt-1 text-neutral-400 italic">
                      {p.source_url ? "See website for pricing" : "Price not confirmed"}
                    </span>
                  );
                }
                if (price.kind === "linkOnly") {
                  return (
                    <span className="text-sm mt-1 text-neutral-400 italic">
                      Pricing on product page
                    </span>
                  );
                }
                return (
                  <span className="text-sm mt-1">
                    {price.text}
                    {price.caution && <span className="text-amber-600 ml-1">⚠</span>}
                  </span>
                );
              })()}
            </Link>
          ))}
        </div>

        {products.length === 0 && (
          <p className="text-neutral-500 mt-8">No products match those filters.</p>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="hover:underline">
                &larr; Previous
              </Link>
            )}
            <span className="text-neutral-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="hover:underline">
                Next &rarr;
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
