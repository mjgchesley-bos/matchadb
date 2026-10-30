import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES, loadGuide } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

const title = "Matcha Guides: Lattes, Grades, Prices and More";
const description =
  "Plain-English answers to common matcha questions, each backed by live price and grade data from brand product pages.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: { title, description, url: `${SITE_URL}/guides` },
};

const usd = (n: number | null) => (n == null ? "n/a" : `$${n.toFixed(2)}`);

export default async function GuidesIndex() {
  const loaded = await Promise.all(GUIDES.map((g) => loadGuide(g)));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha guides",
          url: `${SITE_URL}/guides`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: GUIDES.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/guides/${g.slug}`,
              name: g.h1,
            })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Guides</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Matcha guides</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          The questions people ask most about matcha, answered from the database: grades, uses, prices and origins, compared across brands by price per gram.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loaded.map(({ guide, ctx }) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors"
          >
            <span className="font-display text-xl font-semibold text-ink block">{guide.h1}</span>
            <span className="text-sm text-ink-muted mt-2 block leading-relaxed">{guide.description}</span>
            <span className="text-xs text-ink-faint mt-3 block tabular-nums">
              {ctx.s.count.toLocaleString()} powders &middot; median {usd(ctx.s.median)} per gram
            </span>
          </Link>
        ))}
        <Link
          href="/guides/what-is-ceremonial-matcha"
          className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors"
        >
          <span className="font-display text-xl font-semibold text-ink block">What is &ldquo;ceremonial&rdquo;?</span>
          <span className="text-sm text-ink-muted mt-2 block leading-relaxed">
            Where the term came from, how it relates to the Japanese tea ceremony, and what it does and does not guarantee today.
          </span>
          <span className="text-xs text-ink-faint mt-3 block">Explainer</span>
        </Link>
      </div>
    </main>
  );
}
