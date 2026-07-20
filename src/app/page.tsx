import Image from "next/image";
import Link from "next/link";
import { getStats, getProducts, getFilterOptions, getTieredPicks, type BrowseFilters } from "@/lib/db";
import { toArr } from "@/lib/searchParams";
import { ProductCard, TieredPickCard } from "@/components/product-cards";
import { MatchTool } from "@/components/MatchTool";

// Abbreviated relative to /browse's full result set + pagination -- the home
// page shows a sample plus a link to the full database rather than paging.
const HOME_PAGE_SIZE = 9;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { brandCount, productCount, retailerCount } = await getStats();

  // Home is a matching tool, not a database search -- only grade/use/flavor
  // are exposed here. Search, brand, region, price, and the QA-flag
  // checkboxes are database-search concerns that live on /browse.
  const filters: BrowseFilters = {
    grades: toArr(sp.grade),
    flavors: toArr(sp.flavor),
    uses: toArr(sp.use),
    page: 1,
    pageSize: HOME_PAGE_SIZE,
  };

  const [{ products, total }, filterOptions, tieredPicks] = await Promise.all([
    getProducts(filters),
    getFilterOptions(),
    getTieredPicks(filters),
  ]);

  const seeAllParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (!v) continue;
    for (const item of Array.isArray(v) ? v : [v]) seeAllParams.append(k, item);
  }
  const seeAllHref = seeAllParams.toString() ? `/browse?${seeAllParams.toString()}` : "/browse";

  const stats = [
    { value: productCount.toLocaleString(), label: "Products catalogued" },
    { value: brandCount.toLocaleString(), label: "Brands researched" },
    { value: retailerCount.toLocaleString(), label: "Retailer sites verified" },
  ];

  const featuredBrands = ["Marukyu Koyamaen", "Ippodo", "Kettl", "Aiya", "Rocky's", "Hekisuien"];

  const photoStrip = [
    {
      label: "The harvest",
      src: "/images/strip-the-harvest.jpg",
      alt: "A farmer with a woven basket walking through terraced tea rows in Japan at sunrise",
    },
    {
      label: "The afternoon break",
      src: "/images/strip-the-afternoon-break.jpg",
      alt: "Friends sharing iced matcha lattes at a café table beside a Japanese garden window",
    },
    {
      label: "The ingredient",
      src: "/images/strip-the-ingredient.jpg",
      alt: "Vibrant green matcha powder scattered on dark slate beside a gold measuring spoon",
    },
  ];

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-10 sm:pt-24 text-center">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-6">
            Matcha, catalogued
          </p>
          <h1 className="font-display text-[2.75rem] leading-[1.05] sm:text-[4.25rem] sm:leading-[1.02] font-semibold tracking-tight text-ink text-balance">
            The Global Matcha Database
          </h1>
          <p className="mt-7 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            A research database of {productCount.toLocaleString()} matcha products across{" "}
            {brandCount.toLocaleString()} brands &mdash; pricing, grade, and sourcing pulled
            directly from each brand&apos;s own product pages, kept current, and never smoothed
            over when the source contradicts itself.
          </p>
          <p className="mt-4 text-sm text-ink-faint">
            A guided matching tool and sourcing map are coming in later phases.
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

      <section className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="font-mono text-sm sm:text-base tracking-[0.2em] uppercase text-forest mb-6">Matcha, matched</p>

        <MatchTool filters={filters} options={filterOptions} clearHref="/" />
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        {tieredPicks && (
          <div className="mt-10">
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

        <div className="mt-10">
          <p className="text-sm text-ink-muted mb-5">
            Showing {products.length} of {total.toLocaleString()} matching product
            {total === 1 ? "" : "s"}
          </p>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-ink-muted">No products match those filters.</p>
          )}

          {total > products.length && (
            <div className="mt-8 text-center">
              <Link
                href={seeAllHref}
                className="group inline-flex items-center gap-2 text-matcha hover:text-forest font-medium transition-colors"
              >
                See all {total.toLocaleString()} results in the full database
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Brands in the record</p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-8">
          Home to the names serious matcha drinkers know
        </h2>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
          {featuredBrands.map((b) => (
            <span key={b} className="text-lg text-ink-muted">
              {b}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
