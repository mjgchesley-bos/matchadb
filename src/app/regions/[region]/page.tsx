import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getRegionSummary } from "@/lib/db";
import { getRegionInfo } from "@/lib/regions";
import {
  MIN_PRODUCTS_FOR_PAGE,
  REGION_CONTENT,
  regionFromSlug,
} from "@/lib/region-content";
import { ProductCard, gradeLabel } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return Object.values(REGION_CONTENT).map((c) => ({ region: c.slug }));
}

function money(n: number | null): string {
  return n == null ? "—" : `$${n.toFixed(2)}`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
      <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region: slug } = await params;
  const key = regionFromSlug(slug);
  const info = key ? getRegionInfo(key) : null;
  if (!key || !info) return {};
  const summary = await getRegionSummary(key);
  if (!summary) return {};
  const title = `${info.name} Matcha: Prices, Brands & Flavor Profile`;
  const description = `${summary.productCount} matcha products from ${info.name}, ${info.country} across ${summary.brandCount} brands — typical price per gram, grade mix, flavor profile, and which brands source there.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/regions/${slug}` },
    openGraph: { title, description, url: `${SITE_URL}/regions/${slug}` },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const key = regionFromSlug(slug);
  if (!key) notFound();
  const info = getRegionInfo(key);
  const content = REGION_CONTENT[key];
  const summary = await getRegionSummary(key);
  if (!info || !summary || summary.productCount < MIN_PRODUCTS_FOR_PAGE) notFound();

  const { products } = await getProducts({ region: key, page: 1, pageSize: 12 });
  const canShowPrice = summary.pricedCount >= MIN_PRODUCTS_FOR_PAGE;
  const pageUrl = `${SITE_URL}/regions/${slug}`;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Regions", item: `${SITE_URL}/regions` },
            { "@type": "ListItem", position: 3, name: info.name, item: pageUrl },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">MatchaDB</Link>
        <span aria-hidden="true">/</span>
        <Link href="/regions" className="hover:text-matcha transition-colors">Regions</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint">{info.name}</span>
      </nav>

      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mt-6 mb-2">
        {info.country}
      </p>
      <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight">
        {info.name} matcha
      </h1>
      <p className="text-ink-muted text-lg leading-relaxed mt-4 max-w-2xl">{content.intro}</p>
      {content.note && <p className="text-sm text-ink-faint mt-3 max-w-2xl">{content.note}</p>}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Products" value={String(summary.productCount)} />
        <Stat label="Brands" value={String(summary.brandCount)} />
        <Stat
          label="Typical price / g"
          value={canShowPrice ? money(summary.medianPricePerGram) : "—"}
          sub={
            canShowPrice
              ? `middle half: ${money(summary.p25PricePerGram)}–${money(summary.p75PricePerGram)}`
              : "too few priced products"
          }
        />
        <Stat label="Organic" value={`${Math.round(summary.organicShare * 100)}%`} sub="of products" />
      </div>
      <p className="text-xs text-ink-faint mt-2 max-w-2xl">
        Price is the <em>median</em> across {summary.pricedCount} products with a confirmed price and size (yen, pound and euro prices converted to dollars), so a few
        very expensive competition-grade tins don&apos;t distort it. Products priced by count (sticks,
        tea bags) are excluded.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-8 items-start">
        <div className="flex flex-col gap-8">
          {summary.grades.length > 0 && (
            <section>
              <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Grades sold</h2>
              <div className="flex flex-wrap gap-2">
                {summary.grades.map((g) => (
                  <span key={g.grade} className="rounded-full bg-matcha-soft text-matcha-ink px-3 py-1 text-sm">
                    {gradeLabel(g.grade)} <span className="text-ink-faint">· {g.count}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-faint mt-2">Grade is as each brand labels it; the term isn&apos;t regulated.</p>
            </section>
          )}

          {summary.topFlavors.length > 0 && (
            <section>
              <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Flavor profile</h2>
              <ul className="flex flex-col gap-2">
                {summary.topFlavors.map((f) => (
                  <li key={f.tag} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-ink">{f.tag}</span>
                    <span className="flex-1 h-2 bg-paper-raised border border-line rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-matcha"
                        style={{ width: `${Math.round(f.share * 100)}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-ink-muted tabular-nums">
                      {Math.round(f.share * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-faint mt-2">
                Share of products here whose tasting notes mention each flavor.
              </p>
            </section>
          )}

          <section>
            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Brands sourcing here</h2>
            <ul className="flex flex-wrap gap-2">
              {summary.topBrands.map((b) => (
                <li key={b.name}>
                  <Link
                    href={`/brands/${encodeURIComponent(b.name)}`}
                    className="inline-block rounded-full border border-line-strong text-ink-muted hover:text-ink hover:border-matcha px-3 py-1 text-sm transition-colors"
                  >
                    {b.name} <span className="text-ink-faint">· {b.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="relative w-full sm:w-72 aspect-[8/5] rounded-sm overflow-hidden border border-line">
          <Image
            src={`/region-thumbnails/${key}.png`}
            alt={`Map highlighting ${info.name}, ${info.country}`}
            fill
            sizes="(min-width: 640px) 288px, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">
          Matcha from {info.name}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {summary.productCount > products.length && (
          <Link
            href={`/browse?region=${encodeURIComponent(key)}`}
            className="inline-block mt-5 text-sm text-matcha hover:text-forest transition-colors"
          >
            See all {summary.productCount} products from {info.name} &rarr;
          </Link>
        )}
      </section>

      <p className="text-xs text-ink-faint mt-12">
        Figures are computed from the product pages brands publish; see{" "}
        <Link href="/about" className="underline">how we research</Link>.
      </p>
    </main>
  );
}
