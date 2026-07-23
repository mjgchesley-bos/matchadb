import type { Metadata } from "next";
import { getRegionCounts, getStats } from "@/lib/db";
import { SourcingMap } from "@/components/SourcingMap";
import { FARM_LOCATIONS } from "@/lib/farms";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sourcing Map — Where Matcha Comes From",
  description:
    "An interactive map of matcha growing regions and named farms, built from sourcing disclosures on brands' own product pages — real administrative boundaries only, never fabricated farm outlines.",
  alternates: { canonical: `${SITE_URL}/map` },
};

export default async function MapPage() {
  const [regionCounts, stats] = await Promise.all([getRegionCounts(), getStats()]);
  const totalWithRegion = regionCounts.reduce((sum, r) => sum + r.count, 0);

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Sourcing</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
          Where the matcha comes from
        </h1>
        <p className="text-ink-muted mt-2">
          {totalWithRegion} of {stats.productCount} products have a disclosed growing region, pulled
          directly from each brand&apos;s own product page. A diamond marker means a brand named a
          specific farm and we independently verified its location; everything else is only as
          precise as the city or prefecture the brand itself disclosed. No farm property boundaries
          are shown -- there's no public registry of land-parcel outlines for private tea farms, so
          we don't draw shapes that don't correspond to anything real.
        </p>
      </div>

      <SourcingMap regionCounts={regionCounts} farmLocations={FARM_LOCATIONS} />
    </main>
  );
}
