import type { Metadata } from "next";
import Link from "next/link";
import { getRegionSummary } from "@/lib/db";
import { getRegionInfo } from "@/lib/regions";
import { MIN_PRODUCTS_FOR_PAGE, REGION_CONTENT } from "@/lib/region-content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Matcha Growing Regions Compared",
  description:
    "Compare matcha by where it's grown: Uji, Kagoshima, Nishio, Yame and more — product counts, typical price per gram, and the brands that source from each.",
  alternates: { canonical: `${SITE_URL}/regions` },
};

export default async function RegionsIndexPage() {
  const summaries = (
    await Promise.all(Object.keys(REGION_CONTENT).map((key) => getRegionSummary(key)))
  )
    .filter((s): s is NonNullable<typeof s> => s !== null && s.productCount >= MIN_PRODUCTS_FOR_PAGE)
    .sort((a, b) => b.productCount - a.productCount);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Regions</p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
        Matcha by where it&apos;s grown
      </h1>
      <p className="text-ink-muted mt-3 max-w-2xl leading-relaxed">
        Origin shapes price and flavor. Each region below summarizes the products brands say come from
        there: how many, what they typically cost per gram, and which brands source from them.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaries.map((s) => {
          const info = getRegionInfo(s.region);
          const content = REGION_CONTENT[s.region];
          if (!info) return null;
          return (
            <Link
              key={s.region}
              href={`/regions/${content.slug}`}
              className="border border-line rounded-sm p-5 bg-paper-raised hover:border-matcha hover:bg-matcha-soft transition-colors flex flex-col gap-2"
            >
              <span className="font-display text-xl font-semibold text-ink">{info.name}</span>
              <span className="text-xs text-ink-faint">{info.country}</span>
              <span className="text-sm text-ink-muted mt-1">
                {s.productCount} products · {s.brandCount} brands
                {s.pricedCount >= MIN_PRODUCTS_FOR_PAGE && s.medianPricePerGram != null
                  ? ` · typically $${s.medianPricePerGram.toFixed(2)}/g`
                  : ""}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-ink-faint mt-8">
        Regions with fewer than {MIN_PRODUCTS_FOR_PAGE} products aren&apos;t summarized, since a
        handful of products can&apos;t support a meaningful comparison.
      </p>
    </main>
  );
}
