import Link from "next/link";
import { getProducts, getFilterOptions, getTieredPicks, type BrowseFilters, type ProductRow } from "@/lib/db";
import { formatPrice } from "@/lib/price";

function toStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toArr(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function toNum(v: string | string[] | undefined): number | undefined {
  const s = toStr(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const fieldClass =
  "w-full border border-line-strong rounded-sm px-3 py-2 bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha transition-colors";
const labelClass = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";

// Checkbox rendered as a toggle pill -- no client JS needed, since browsers
// natively submit one query param per checked box sharing the same `name`.
function PillCheckbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted transition-colors peer-hover:border-matcha peer-checked:bg-matcha peer-checked:text-paper peer-checked:border-matcha">
        {label || value}
      </span>
    </label>
  );
}

// Usucha/koicha are preparation styles (thin vs. thick tea), not
// self-explanatory the way "Ceremonial"/"Culinary" are -- a short
// parenthetical saves someone a trip to a glossary.
function gradeLabel(grade: string): string {
  if (grade === "Usucha") return "Usucha (standard)";
  if (grade === "Koicha") return "Koicha (thick)";
  return grade;
}

function ProductCard({ product: p }: { product: ProductRow }) {
  return (
    <Link
      href={`/products/${p.id}`}
      className="border border-line rounded-sm p-4 hover:border-matcha bg-paper-raised hover:bg-matcha-soft transition-colors flex flex-col gap-1"
    >
      <span className="text-xs uppercase tracking-wide text-ink-faint">{p.brand_name}</span>
      <span className="font-medium text-ink leading-snug">{p.product_name}</span>
      <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
        {p.grade && (
          <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">{p.grade}</span>
        )}
        {p.region && (
          <span className="rounded-full bg-paper-raised border border-line text-ink-muted px-2 py-0.5">
            {p.region}
          </span>
        )}
        {p.organic_certified === 1 && (
          <span className="rounded-full bg-gold-soft text-gold px-2 py-0.5">Organic</span>
        )}
        {(JSON.parse(p.flavor_tags) as string[]).slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
        {p.has_contradictions === 1 && (
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5">
            &#9888; flagged
          </span>
        )}
        {p.not_found === 1 && (
          <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5">
            unverifiable
          </span>
        )}
      </div>
      {(() => {
        const price = formatPrice(p);
        if (price.kind === "unresolved") {
          return (
            <span className="text-sm mt-1.5 text-ink-faint italic">
              {p.source_url ? "See website for pricing" : "Price not confirmed"}
            </span>
          );
        }
        if (price.kind === "linkOnly") {
          return <span className="text-sm mt-1.5 text-ink-faint italic">Pricing on product page</span>;
        }
        return (
          <span className="text-sm mt-1.5 tabular-nums text-ink">
            {price.text}
            {price.caution && <span className="text-amber-600 ml-1">&#9888;</span>}
          </span>
        );
      })()}
    </Link>
  );
}

// Same info as ProductCard, but as the featured "one per price tier" pick --
// bolder border and a tier-name badge instead of the plain brand/grade line.
function TieredPickCard({ label, product: p }: { label: string; product: ProductRow }) {
  const price = formatPrice(p);
  return (
    <Link
      href={`/products/${p.id}`}
      className="border-2 border-matcha rounded-sm p-4 bg-paper hover:bg-matcha-soft transition-colors flex flex-col gap-1"
    >
      <span className="inline-block self-start rounded-full bg-matcha text-paper px-2.5 py-0.5 text-xs font-medium tracking-wide mb-1">
        {label}
      </span>
      <span className="text-xs uppercase tracking-wide text-ink-faint">{p.brand_name}</span>
      <span className="font-medium text-ink leading-snug">{p.product_name}</span>
      {price.kind === "resolved" && (
        <span className="text-sm mt-1.5 tabular-nums text-ink">{price.text}</span>
      )}
    </Link>
  );
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
    grades: toArr(sp.grade),
    region: toStr(sp.region),
    flavors: toArr(sp.flavor),
    uses: toArr(sp.use),
    organicOnly: toStr(sp.organicOnly) === "1",
    hasContradictionsOnly: toStr(sp.hasContradictionsOnly) === "1",
    minPrice: toNum(sp.minPrice),
    maxPrice: toNum(sp.maxPrice),
    page: toNum(sp.page) || 1,
    pageSize: 24,
  };

  const [{ products, total, page, totalPages }, { brands, grades, regions, flavors, uses }, tieredPicks] =
    await Promise.all([getProducts(filters), getFilterOptions(), getTieredPicks(filters)]);

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
          <form method="get" className="flex flex-col gap-5 text-sm">
            <div>
              <label className={labelClass} htmlFor="q">
                Search
              </label>
              <input
                id="q"
                name="q"
                defaultValue={filters.q}
                placeholder="Brand or product name"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="brand">
                Brand
              </label>
              <select id="brand" name="brand" defaultValue={filters.brand || ""} className={fieldClass}>
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={labelClass}>Grade</span>
              <div className="flex flex-wrap gap-2">
                {grades.map((g) => (
                  <PillCheckbox
                    key={g}
                    name="grade"
                    value={g}
                    label={gradeLabel(g)}
                    defaultChecked={filters.grades!.includes(g)}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className={labelClass}>Use</span>
              <div className="flex flex-wrap gap-2">
                {uses.map((u) => (
                  <PillCheckbox key={u} name="use" value={u} defaultChecked={filters.uses!.includes(u)} />
                ))}
              </div>
            </div>

            <div>
              <span className={labelClass}>Flavor</span>
              <div className="flex flex-wrap gap-2">
                {flavors.map((f) => (
                  <PillCheckbox key={f} name="flavor" value={f} defaultChecked={filters.flavors!.includes(f)} />
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="region">
                Region
              </label>
              <select id="region" name="region" defaultValue={filters.region || ""} className={fieldClass}>
                <option value="">Any region</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass} htmlFor="minPrice">
                  Min $
                </label>
                <input
                  id="minPrice"
                  name="minPrice"
                  type="number"
                  step="0.01"
                  defaultValue={filters.minPrice}
                  className={fieldClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass} htmlFor="maxPrice">
                  Max $
                </label>
                <input
                  id="maxPrice"
                  name="maxPrice"
                  type="number"
                  step="0.01"
                  defaultValue={filters.maxPrice}
                  className={fieldClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-ink-muted">
              <input
                type="checkbox"
                name="organicOnly"
                value="1"
                defaultChecked={filters.organicOnly}
                className="accent-matcha"
              />
              Organic-certified only
            </label>

            <label className="flex items-center gap-2.5 text-ink-muted">
              <input
                type="checkbox"
                name="hasContradictionsOnly"
                value="1"
                defaultChecked={filters.hasContradictionsOnly}
                className="accent-matcha"
              />
              Flag: has contradictions
            </label>

            <button
              type="submit"
              className="bg-matcha text-paper py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors"
            >
              Apply filters
            </button>
            <Link href="/browse" className="text-center text-ink-faint hover:text-ink-muted transition-colors">
              Clear all
            </Link>
          </form>
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
