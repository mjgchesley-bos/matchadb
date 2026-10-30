import type { Metadata } from "next";
import Link from "next/link";
import { CULTIVARS, loadCultivar } from "@/lib/cultivars";
import { usd } from "@/components/GuideBlocks";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

const title = "Matcha Cultivars: Yabukita, Okumidori, Samidori and More";
const description =
  "Profiles of the tea cultivars behind matcha, with price, grade, growing region and flavor notes for each, computed from brands' own product pages.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/cultivars` },
  openGraph: { title, description, url: `${SITE_URL}/cultivars` },
};

export default async function CultivarsIndex() {
  const loaded = await Promise.all(CULTIVARS.map((c) => loadCultivar(c)));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha cultivars",
          url: `${SITE_URL}/cultivars`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: CULTIVARS.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/cultivars/${c.slug}`, name: c.h1 })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Cultivars</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Matcha cultivars</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          A cultivar is the tea plant variety a matcha is made from. Brands name it on many product pages, and it can say as much about a matcha as its grade. Each profile pairs background
          from published sources with price, grade and growing-region data from the database.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loaded.map(({ cultivar, s }) => (
          <Link key={cultivar.slug} href={`/cultivars/${cultivar.slug}`} className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors">
            <span className="font-display text-xl font-semibold text-ink block">{cultivar.h1}</span>
            <span className="text-sm text-ink-muted mt-2 block leading-relaxed">{cultivar.description}</span>
            <span className="text-xs text-ink-faint mt-3 block tabular-nums">
              {s.count.toLocaleString()} powders &middot; {s.brands} brands &middot; median {usd(s.median)} per gram
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        New to matcha vocabulary? See the{" "}
        <Link href="/guides" className="text-matcha hover:text-forest">
          guides
        </Link>{" "}
        for grades, uses and prices.
      </p>
    </main>
  );
}
