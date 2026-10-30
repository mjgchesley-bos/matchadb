import type { Metadata } from "next";
import Link from "next/link";
import { getMapLocations } from "@/lib/map-data";
import { getRegionCounts, getStats } from "@/lib/db";
import { SourcingExplorer } from "@/components/SourcingExplorer";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sourcing Map — Where Matcha Comes From",
  description:
    "An interactive map of where matcha is grown: click a region, district or farm to fly in and see its brands, products, grades, cultivars and prices. Built from brands' own product pages, with real administrative boundaries only.",
  alternates: { canonical: `${SITE_URL}/map` },
};

export default async function MapPage() {
  const [locations, regionCounts, stats] = await Promise.all([getMapLocations(), getRegionCounts(), getStats()]);
  const totalWithRegion = regionCounts.reduce((sum, r) => sum + r.count, 0);

  return (
    <main className="flex-1 w-full">
      <SourcingExplorer locations={locations} totalProducts={stats.productCount} />

      <section className="max-w-3xl mx-auto w-full px-6 py-12 text-sm text-ink-muted leading-relaxed flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">How to read this map</h2>
        <p>
          {totalWithRegion.toLocaleString()} of {stats.productCount.toLocaleString()} products name a growing region on the brand&apos;s own product page. The map places each product where
          the brand says the tea leaf is grown. It does not show where a company is based, and a brand headquartered in one country can sell matcha grown in another.
        </p>
        <p>
          Numbers on the pins count products. Click a region, a district or a farm to fly in and open its panel: median price per gram, grade mix, cultivars and flavor notes brands report, and
          the brands and sample products behind it. The Satellite view adds terrain so you can see the hills the tea grows on.
        </p>
        <p>
          Green outlines are real administrative boundaries: towns and prefectures where a brand&apos;s disclosure (or another verified source) named one, plus Taiwan, a country small enough
          that outlining it is still informative. Regions that never get more specific than a large country, or that span several prefectures with no single boundary, show only a point. Smaller
          dots appear as you zoom in for districts and towns that brands name on at least two products (Ogura, Ujitawara, Kirishima, Hoshino and others); those are places a brand named, not farm
          locations. A few dots mark specific named farms whose location we independently verified; their panel says so and links the source.
        </p>
        <p>
          No farm property boundaries are shown anywhere. There is no public registry of land-parcel outlines for private tea farms, so drawing one would mean inventing a shape that does not
          correspond to anything real.
        </p>
        <p>
          <Link href="/browse" className="text-matcha hover:text-forest transition-colors">
            Browse all products
          </Link>{" "}
          for full detail, or read about each region on the{" "}
          <Link href="/regions" className="text-matcha hover:text-forest transition-colors">
            regions pages
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
