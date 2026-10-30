import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CULTIVARS, cultivarBySlug, loadCultivar, type LoadedCultivar } from "@/lib/cultivars";
import { GroupTable, usd } from "@/components/GuideBlocks";
import { ProductCard } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return CULTIVARS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = cultivarBySlug(slug);
  if (!c) return {};
  const url = `${SITE_URL}/cultivars/${c.slug}`;
  return { title: c.title, description: c.description, alternates: { canonical: url }, openGraph: { title: c.title, description: c.description, url } };
}

function faqFor(d: LoadedCultivar): { q: string; a: string }[] {
  const { cultivar: c, s, all, grade, region, flavors } = d;
  const out: { q: string; a: string }[] = [];
  if (flavors.length >= 2) {
    const top = flavors.slice(0, 3).map((f) => `${f.tag.toLowerCase()} (${Math.round(f.share * 100)}%)`);
    out.push({
      q: `What does ${c.name} matcha taste like?`,
      a: `Among ${c.name} matcha whose brands report flavor notes, the most common are ${top.join(", ")}. Flavor depends as much on shading, harvest and milling as on the cultivar, so treat this as a guide to what brands say, not a guarantee.`,
    });
  }
  if (grade.length) {
    const parts = grade.slice(0, 4).map((g) => `${g.count} ${g.name === "Not stated" ? "with no grade stated" : g.name.toLowerCase()}`);
    out.push({
      q: `Is ${c.name} used for ceremonial or culinary matcha?`,
      a: `Of ${s.count} plain ${c.name} matcha powders in the database, ${parts.join(", ")}. Grades are the labels brands choose, and there is no official standard behind them.`,
    });
  }
  if (region.length) {
    const parts = region.slice(0, 4).map((r) => `${r.name} (${r.count})`);
    out.push({
      q: `Where is ${c.name} matcha grown?`,
      a: `Brands that name a growing region for ${c.name} matcha most often name ${parts.join(", ")}. This is where the brand says the leaf was grown, as stated on its own product page.`,
    });
  }
  if (s.median != null && s.p25 != null && s.p75 != null) {
    const rel = all.median ? (s.median > all.median ? "above" : s.median < all.median ? "below" : "in line with") : null;
    out.push({
      q: `How much does ${c.name} matcha cost?`,
      a: `Across ${s.count} ${c.name} matcha powders from ${s.brands} brands, the median is ${usd(s.median)} per gram and the middle half fall between ${usd(s.p25)} and ${usd(s.p75)}${rel && all.median ? `, ${rel} the ${usd(all.median)} median for all matcha powders on the site` : ""}.`,
    });
  }
  return out;
}

export default async function CultivarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cultivar = cultivarBySlug(slug);
  if (!cultivar) notFound();

  const d = await loadCultivar(cultivar);
  const { s, all, grade, region, brands, flavors, picks, studies, organicShare } = d;
  const url = `${SITE_URL}/cultivars/${cultivar.slug}`;
  const faq = faqFor(d);
  const related = cultivar.related.map((r) => cultivarBySlug(r)).filter((x): x is NonNullable<typeof x> => !!x);
  const stats: [string, string][] = [
    [s.count.toLocaleString(), `plain matcha powders naming ${cultivar.name}`],
    [s.brands.toLocaleString(), "brands"],
    [usd(s.median), `median per gram${all.median ? ` (all matcha ${usd(all.median)})` : ""}`],
    [s.p25 != null && s.p75 != null ? `${usd(s.p25)}–${usd(s.p75)}` : "n/a", "middle half of prices"],
  ];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: cultivar.h1,
              url,
              description: cultivar.description,
              about: { "@type": "Thing", name: `${cultivar.name} tea cultivar` },
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: picks.length,
                itemListElement: picks.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/products/${p.id}`, name: `${p.brand_name} ${p.product_name}` })),
              },
            },
            ...(faq.length
              ? [{ "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
              : []),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Cultivars", item: `${SITE_URL}/cultivars` },
                { "@type": "ListItem", position: 2, name: cultivar.name, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/cultivars" className="hover:text-ink">Cultivars</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{cultivar.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Tea cultivar</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{cultivar.h1}</h1>
        <div className="mt-5 flex flex-col gap-4 text-lg text-ink-muted leading-relaxed">
          {cultivar.intro.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </header>

      {cultivar.profile.length > 0 && (
        <section className="mt-8 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-label="Cultivar profile">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Profile</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-6 gap-y-2 text-sm">
            {cultivar.profile.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {cultivar.sources.length > 0 && (
            <p className="mt-4 text-xs text-ink-faint leading-relaxed">
              Background from published sources, which sometimes differ in detail:{" "}
              {cultivar.sources.map((src, i) => (
                <span key={src.url}>
                  {i > 0 && "; "}
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">
                    {src.label}
                  </a>
                </span>
              ))}
              .
            </p>
          )}
        </section>
      )}

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="In our data">
        {stats.map(([v, l]) => (
          <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
            <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6">
        <GroupTable title="By grade (as each brand labels it)" rows={grade} label="Grade" />
        <GroupTable title="By growing region" rows={region} label="Region" />
        <GroupTable title="Brands naming this cultivar (up to eight)" rows={brands} label="Brand" showBrands={false} />
        <p className="text-xs text-ink-faint -mt-3">
          Rows with fewer than three products (two for regions, one for brands) are left out. &ldquo;Middle half&rdquo; is the price-per-gram range from the 25th to the 75th percentile.
          {organicShare > 0 ? ` ${Math.round(organicShare * 100)}% of these powders are listed as organic.` : ""}
        </p>
      </section>

      {flavors.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Flavor notes brands report</h2>
          <div className="flex flex-wrap gap-2">
            {flavors.map((f) => (
              <span key={f.tag} className="rounded-full bg-matcha-soft px-3 py-1 text-sm text-matcha-ink">
                {f.tag} <span className="tabular-nums opacity-70">{Math.round(f.share * 100)}%</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Share of {cultivar.name} powders with reported flavor notes that mention each one.</p>
        </section>
      )}

      {picks.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">{cultivar.name} matcha from well-known brands</h2>
          <p className="mt-1 text-sm text-ink-muted">One product per brand first, in order of brand recognition.</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Link
            href={`/browse?q=${encodeURIComponent(cultivar.name)}&ships=any`}
            className="inline-block mt-6 rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors"
          >
            Search the full database for {cultivar.name}
          </Link>
        </section>
      )}

      {faq.length > 0 && (
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
      )}

      {studies > 0 && (
        <section className="mt-10 max-w-3xl">
          <p className="text-sm text-ink-muted">
            {studies} stud{studies === 1 ? "y" : "ies"} in the research library mention {cultivar.name}.{" "}
            <Link href={`/research?q=${encodeURIComponent(cultivar.name)}`} className="text-matcha hover:text-forest">
              Read them &rarr;
            </Link>
          </p>
        </section>
      )}

      <section className="mt-12 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-cultivar">
        <h2 id="how-cultivar" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">How these numbers were made</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Counts and prices cover plain matcha powders whose own product page names {cultivar.name}: flavored blends, tea bags, sweetened mixes, packs under 20 grams and products without a
          verified price are excluded, and only brands that ship to the United States are included. A blend of several cultivars is counted once, under the first cultivar found on its page.
          Prices are converted to US dollars and shown per gram. Descriptions of a cultivar&apos;s character come from published sources and sellers; we do not taste or rank products.
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Other cultivars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/cultivars/${r.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{r.name}</span>
                <span className="text-sm text-ink-muted mt-1 block">{r.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
