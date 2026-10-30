import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAIRS, loadComparison, pairBySlug, pairSlug, type BrandSide } from "@/lib/compare";
import { usd } from "@/components/GuideBlocks";
import { BrandLogo, ProductCard, gradeLabel } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return PAIRS.map(([a, b]) => ({ slug: pairSlug(a, b) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pair = pairBySlug(slug);
  if (!pair) return {};
  const [a, b] = pair;
  const title = `${a} vs ${b}: Matcha Price & Origin Compared`;
  const description = `${a} and ${b} matcha compared side by side: price per gram, grades, growing regions, cultivars and shipping, calculated from each brand's own product pages.`;
  const url = `${SITE_URL}/compare/${slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

const stripStop = (s: string | null) => (s ? s.replace(/\.+$/, "") : null);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const items = (xs: { name: string; count: number }[]) => (xs.length ? xs.map((x) => `${x.name === "Not stated" ? "Not stated" : gradeLabel(x.name)} (${x.count})`).join(", ") : "None named");
const plain = (xs: { name: string; count: number }[]) => (xs.length ? xs.map((x) => `${x.name} (${x.count})`).join(", ") : "None named");

function priceVerdict(a: BrandSide, b: BrandSide): string | null {
  const ma = a.powders.median;
  const mb = b.powders.median;
  if (ma == null || mb == null || a.powders.count < 3 || b.powders.count < 3) return null;
  if (Math.abs(ma - mb) / Math.max(ma, mb) < 0.05) return `${a.name} and ${b.name} have almost the same median price per gram (${usd(ma)} and ${usd(mb)}).`;
  const [lo, hi] = ma < mb ? [a, b] : [b, a];
  const drop = Math.round((1 - lo.powders.median! / hi.powders.median!) * 100);
  const small = Math.min(a.powders.count, b.powders.count) < 6 ? " With so few priced powders on one side, read the medians as rough." : "";
  return `At the median, ${lo.name} costs about ${drop}% less per gram than ${hi.name} (${usd(lo.powders.median)} against ${usd(hi.powders.median)}), across ${lo.powders.count} and ${hi.powders.count} powders.${small}`;
}

function faqFor(a: BrandSide, b: BrandSide): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const v = priceVerdict(a, b);
  if (v) {
    out.push({
      q: `Which is cheaper per gram, ${a.name} or ${b.name}?`,
      a: `${v} Medians describe typical pricing, not every product. Price per gram runs from ${usd(a.powders.min)} to ${usd(a.powders.max)} across ${a.name} powders and from ${usd(b.powders.min)} to ${usd(b.powders.max)} across ${b.name} powders. Price does not measure quality, and we do not rank taste.`,
    });
  }
  out.push({
    q: `How many matcha products do ${a.name} and ${b.name} have?`,
    a: `The database lists ${a.total} ${a.name} product${a.total === 1 ? "" : "s"} and ${b.total} ${b.name} product${b.total === 1 ? "" : "s"}. That counts every matcha item we have catalogued from each brand, including blends and different pack formats.`,
  });
  out.push({
    q: `Where is ${a.name} matcha grown, and where is ${b.name} matcha grown?`,
    a: `${a.name} names a growing region on ${pct(a.regionShare)} of its products, most often ${plain(a.regions.slice(0, 3))}. ${b.name} names one on ${pct(b.regionShare)}, most often ${plain(b.regions.slice(0, 3))}. This is where each brand says the leaf is grown, not where the company is based.`,
  });
  out.push({
    q: `Where do ${a.name} and ${b.name} ship?`,
    a: `${a.name}: ${stripStop(a.shippingNote) ?? "no shipping restriction is recorded"}. ${b.name}: ${stripStop(b.shippingNote) ?? "no shipping restriction is recorded"}. We only record limits stated in a brand's own shipping policy, so check each brand's page before ordering.`,
  });
  return out;
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pair = pairBySlug(slug);
  if (!pair) notFound();
  const [nameA, nameB] = pair;

  const { a, b } = await loadComparison(nameA, nameB);
  const url = `${SITE_URL}/compare/${slug}`;
  const faq = faqFor(a, b);
  const verdict = priceVerdict(a, b);
  const others = PAIRS.filter(([x, y]) => pairSlug(x, y) !== slug && (x === nameA || y === nameA || x === nameB || y === nameB)).slice(0, 6);

  const rows: [string, string, string][] = [
    ["Products in the database", String(a.total), String(b.total)],
    ["Plain powders compared", String(a.powders.count), String(b.powders.count)],
    ["Median price per gram", usd(a.powders.median), usd(b.powders.median)],
    ["Middle half of prices", a.powders.p25 != null ? `${usd(a.powders.p25)}–${usd(a.powders.p75)}` : "n/a", b.powders.p25 != null ? `${usd(b.powders.p25)}–${usd(b.powders.p75)}` : "n/a"],
    ["Lowest price per gram", a.cheapest ? `${usd(a.cheapest.price_per_gram)} (${a.cheapest.product_name})` : "n/a", b.cheapest ? `${usd(b.cheapest.price_per_gram)} (${b.cheapest.product_name})` : "n/a"],
    ["Highest price per gram", a.priciest ? `${usd(a.priciest.price_per_gram)} (${a.priciest.product_name})` : "n/a", b.priciest ? `${usd(b.priciest.price_per_gram)} (${b.priciest.product_name})` : "n/a"],
    ["Grades (as the brand labels them)", items(a.grades), items(b.grades)],
    ["Growing regions named", `${plain(a.regions)} · on ${pct(a.regionShare)} of products`, `${plain(b.regions)} · on ${pct(b.regionShare)} of products`],
    ["Cultivars named", plain(a.cultivars), plain(b.cultivars)],
    ["Listed as organic", pct(a.organicShare), pct(b.organicShare)],
    ["Ships to", a.shipping, b.shipping],
  ];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: `${nameA} vs ${nameB}`,
              url,
              description: `${nameA} and ${nameB} matcha compared by price per gram, grade, growing region, cultivar and shipping.`,
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: 2,
                itemListElement: [nameA, nameB].map((n, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/brands/${encodeURIComponent(n)}`, name: n })),
              },
            },
            { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Compare", item: `${SITE_URL}/compare` },
                { "@type": "ListItem", position: 2, name: `${nameA} vs ${nameB}`, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/compare" className="hover:text-ink">Compare</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{nameA} vs {nameB}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Brand comparison</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{nameA} vs {nameB}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {nameA} and {nameB} compared side by side from the database: what their matcha costs per gram, how they grade it, where they say it is grown and where they ship. {verdict ?? ""}
        </p>
        <p className="mt-3 text-sm text-ink-faint">We compare facts from each brand&apos;s own product pages. We do not taste, score or rank brands.</p>
      </header>

      <section className="mt-8 border border-line rounded-sm bg-paper-raised" aria-label="Side-by-side comparison">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 sm:px-5 py-3 font-normal text-xs uppercase tracking-wide text-ink-faint w-[28%]"> </th>
                {[nameA, nameB].map((n) => (
                  <th key={n} className="px-2 sm:px-4 py-3 align-bottom">
                    <Link href={`/brands/${encodeURIComponent(n)}`} className="flex items-center gap-2.5 font-display text-base sm:text-lg font-semibold text-ink hover:text-matcha">
                      <span className="hidden sm:inline-flex">
                        <BrandLogo brandName={n} size={28} maxWidth={90} />
                      </span>
                      <span>{n}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, x, y]) => (
                <tr key={label} className="border-t border-line align-top">
                  <th scope="row" className="px-2 sm:px-5 py-3 text-left font-normal text-ink-faint break-words">{label}</th>
                  <td className="px-2 sm:px-4 py-3 text-ink tabular-nums break-words">{x}</td>
                  <td className="px-2 sm:px-4 py-3 text-ink tabular-nums break-words">{y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {[a, b].map((side) => (
        <section key={side.name} className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">{side.name} across its price range</h2>
          <p className="mt-1 text-sm text-ink-muted">Up to six plain powders, spread from the lowest to the highest price per gram.</p>
          {side.spread.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {side.spread.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-ink-muted">No plain powders with a verified price yet.</p>
          )}
          <Link href={`/brands/${encodeURIComponent(side.name)}`} className="inline-block mt-5 text-matcha hover:text-forest">
            All {side.total} {side.name} products &rarr;
          </Link>
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

      <section className="mt-12 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-compare">
        <h2 id="how-compare" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">How this was compared</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Price figures cover plain matcha powders with a verified price and a pack of at least 20 grams; flavored blends, tea bags, sweetened mixes and single-serve packs are excluded. Prices
          are converted to US dollars and shown per gram, and medians are used instead of averages so a few expensive competition tins do not distort a brand&apos;s typical price. Grades are the
          labels each brand uses, with no official standard behind them. Product counts, regions, cultivars and organic share cover every product catalogued for the brand. Both brands can
          change prices at any time; the numbers refresh whenever the site is rebuilt.
        </p>
      </section>

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">More comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {others.map(([x, y]) => (
              <Link key={pairSlug(x, y)} href={`/compare/${pairSlug(x, y)}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{x} vs {y}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

