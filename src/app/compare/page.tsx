import type { Metadata } from "next";
import Link from "next/link";
import { PAIRS, loadComparison, pairSlug } from "@/lib/compare";
import { usd } from "@/components/GuideBlocks";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

const title = "Compare Matcha Brands: Price, Grade and Origin Side by Side";
const description = "Head-to-head comparisons of popular matcha brands by price per gram, grade, growing region, cultivar and shipping, from each brand's own product pages.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/compare` },
  openGraph: { title, description, url: `${SITE_URL}/compare` },
};

export default async function CompareIndex() {
  const loaded = await Promise.all(PAIRS.map(([a, b]) => loadComparison(a, b)));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha brand comparisons",
          url: `${SITE_URL}/compare`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: PAIRS.map(([a, b], i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/compare/${pairSlug(a, b)}`, name: `${a} vs ${b}` })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Compare</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Compare matcha brands</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          Two brands, side by side: what their matcha costs per gram, how they grade it, where they say it is grown and where they ship. Facts from each brand&apos;s own product pages, with
          no taste scores.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PAIRS.map(([a, b], i) => {
          const { a: A, b: B } = loaded[i];
          return (
            <Link key={pairSlug(a, b)} href={`/compare/${pairSlug(a, b)}`} className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors">
              <span className="font-display text-xl font-semibold text-ink block">{a} vs {b}</span>
              <span className="text-xs text-ink-faint mt-3 block tabular-nums">
                Median per gram: {usd(A.powders.median)} vs {usd(B.powders.median)} &middot; {A.total} vs {B.total} products
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
