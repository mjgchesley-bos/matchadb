import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug, loadGuide } from "@/lib/guides";
import type { Group } from "@/lib/guide-data";
import { GUIDE_MIN_GRAMS } from "@/lib/guide-data";
import { ProductCard } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  const url = `${SITE_URL}/guides/${g.slug}`;
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: url },
    openGraph: { title: g.title, description: g.description, url },
  };
}

const usd = (n: number | null) => (n == null ? "n/a" : `$${n.toFixed(2)}`);

function GroupTable({ title, rows, label }: { title: string; rows: Group[]; label: string }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.median ?? 0), 0.01);
  return (
    <div className="border border-line rounded-sm bg-paper-raised px-3 sm:px-5 py-4">
      <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] sm:text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="font-normal pb-2 pr-3 sm:pr-4">{label}</th>
              <th className="font-normal pb-2 pr-3 sm:pr-4 text-right">Products</th>
              <th className="font-normal pb-2 pr-3 sm:pr-4 text-right hidden sm:table-cell">Brands</th>
              <th className="font-normal pb-2 pr-3 sm:pr-4">Median / g</th>
              <th className="font-normal pb-2 text-right whitespace-nowrap">Middle half</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line">
                <td className="py-2 pr-3 sm:pr-4 text-ink">{r.name}</td>
                <td className="py-2 pr-3 sm:pr-4 text-right tabular-nums text-ink-muted">{r.count}</td>
                <td className="py-2 pr-3 sm:pr-4 text-right tabular-nums text-ink-muted hidden sm:table-cell">{r.brands}</td>
                <td className="py-2 pr-3 sm:pr-4">
                  <span className="flex items-center gap-2">
                    <span className="hidden sm:block h-2 w-24 rounded-full bg-matcha-soft overflow-hidden shrink-0" aria-hidden="true">
                      <span className="block h-full bg-matcha rounded-full" style={{ width: `${((r.median ?? 0) / max) * 100}%` }} />
                    </span>
                    <span className="tabular-nums text-ink">{usd(r.median)}</span>
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-ink-muted whitespace-nowrap">
                  {usd(r.p25)}&ndash;{usd(r.p75)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const { ctx, lists } = await loadGuide(guide);
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const faq = guide.faq.map((f) => ({ q: f.q, a: f.a(ctx) }));
  const related = guide.related.map((s) => guideBySlug(s)).filter((g): g is NonNullable<typeof g> => !!g);
  const stats: [string, string][] = [
    [ctx.s.count.toLocaleString(), "matcha powders compared"],
    [ctx.s.brands.toLocaleString(), "brands"],
    [usd(ctx.s.median), "median per gram"],
    [ctx.s.p25 != null && ctx.s.p75 != null ? `${usd(ctx.s.p25)}–${usd(ctx.s.p75)}` : "n/a", "middle half of prices"],
  ];
  const featured = lists[0]?.products ?? [];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: guide.h1,
              url,
              description: guide.description,
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: featured.length,
                itemListElement: featured.map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_URL}/products/${p.id}`,
                  name: `${p.brand_name} ${p.product_name}`,
                })),
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Guides", item: `${SITE_URL}/guides` },
                { "@type": "ListItem", position: 2, name: guide.h1, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/guides" className="hover:text-ink">Guides</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{guide.h1}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Matcha guide</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{guide.h1}</h1>
        <div className="mt-5 flex flex-col gap-4 text-lg text-ink-muted leading-relaxed">
          {guide.intro.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="At a glance">
        {stats.map(([v, l]) => (
          <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
            <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </section>

      {guide.tables.length > 0 && (
        <section className="mt-8 grid grid-cols-1 gap-6">
          {guide.tables.includes("grade") && <GroupTable title="By grade (as each brand labels it)" rows={ctx.grade} label="Grade" />}
          {guide.tables.includes("region") && <GroupTable title="By growing region" rows={ctx.region} label="Region" />}
          <p className="text-xs text-ink-faint -mt-3">
            Groups with fewer than three products are left out. &ldquo;Middle half&rdquo; is the price-per-gram range from the 25th to the 75th percentile.
          </p>
        </section>
      )}

      {lists.map((l) => (
        <section key={l.heading} className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">{l.heading}</h2>
          {l.note && <p className="mt-1 text-sm text-ink-muted">{l.note}</p>}
          {l.products.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {l.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-ink-muted">No products match yet.</p>
          )}
          {l.browse && (
            <Link
              href={`/browse?${l.browse}`}
              className="inline-block mt-6 rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors"
            >
              Filter the full database
            </Link>
          )}
        </section>
      ))}

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold text-ink">Common questions</h2>
        <div className="mt-5 flex flex-col gap-6">
          {faq.map((f) => (
            <div key={f.q}>
              <h3 className="font-display text-lg font-semibold text-ink">{f.q}</h3>
              <p className="mt-1 text-ink-muted leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-compared">
        <h2 id="how-compared" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">How these were compared</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Numbers come from each brand&apos;s own product page and are recalculated whenever the site is rebuilt. Guides compare plain matcha powder: flavored blends, tea bags,
          sweetened latte mixes and single-serve packs are excluded, as are products without a verified price (including any whose product page could not be read) or a pack of at least {GUIDE_MIN_GRAMS} grams. Prices are converted to US
          dollars and shown per gram so tins of different sizes compare fairly. Only brands that ship to the United States are listed. Lists show well-known brands first by an editorial
          recognition score, not by quality or sales, and a product appearing here is not an endorsement. {guide.method}
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">More guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/guides/${r.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{r.h1}</span>
                <span className="text-sm text-ink-muted mt-1 block">{r.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
