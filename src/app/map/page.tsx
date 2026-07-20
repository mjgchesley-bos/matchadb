import { getRegionCounts, getStats } from "@/lib/db";
import { SourcingMap } from "@/components/SourcingMap";

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
          directly from each brand&apos;s own product page.
        </p>
      </div>

      <SourcingMap regionCounts={regionCounts} />
    </main>
  );
}
