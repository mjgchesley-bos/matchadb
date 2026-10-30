import type { Metadata } from "next";
import Link from "next/link";
import { getStores } from "@/lib/stores";
import { StoreFinder } from "@/components/StoreFinder";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

const title = "Where to Buy Matcha in Person: Store Finder";
const description =
  "Find stores near you that sell the matcha brands in our database, with addresses, directions and which brands each carries. Search by ZIP code or use your location.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/stores` },
  openGraph: { title, description, url: `${SITE_URL}/stores` },
};

export default async function StoresPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stores = getStores();
  const wanted = Array.isArray(sp.brand) ? sp.brand[0] : sp.brand;
  const initialBrand = wanted && stores.some((s) => s.brands.some((b) => b.name === wanted)) ? wanted : "";
  const states = new Set(stores.map((s) => s.state)).size;
  const brands = new Set(stores.flatMap((s) => s.brands.map((b) => b.name))).size;

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Where to buy matcha in person",
          url: `${SITE_URL}/stores`,
          description,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: stores.length,
            itemListElement: stores.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Store",
                name: s.name,
                url: s.url,
                address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.city, addressRegion: s.state, postalCode: s.zip, addressCountry: "US" },
                geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng },
              },
            })),
          },
        }}
      />

      <header className="max-w-3xl mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Find in stores</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Where to buy matcha in person</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          Some of the brands here have shops, and some independent tea shops stock them. Search by ZIP code or use your location to find places near you, see which brands each carries and get
          directions.
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          {stores.length} places in {states} states so far, covering {brands} brands. The list is new and growing.
        </p>
      </header>

      <StoreFinder stores={stores} contactEmail={CONTACT_EMAIL} initialBrand={initialBrand} />

      <section className="mt-14 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-stores">
        <h2 id="how-stores" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">How this list is built</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          A place is listed only when its own website gives its address, and a brand is shown as carried only when that website (or the brand&apos;s own store page) says so. Each entry links
          to the page we checked and shows the date. We do not list a store from memory or hearsay, and we do not claim a store carries a brand just because it sells matcha. Stock changes,
          so call ahead before a special trip, especially for a specific product. A brand&apos;s own shop carries that brand&apos;s products; availability of particular items varies by location.
        </p>
        <p className="mt-3 text-sm text-ink-muted leading-relaxed">
          Coverage is far from complete. Most stores that sell matcha do not publish which brands they stock, so an empty map does not mean a place has no matcha. Search results are not
          endorsements. Missing a store?{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MatchaDB store suggestion")}`} className="text-matcha hover:text-forest underline">
            Tell us
          </a>{" "}
          and include a link that shows what it carries. Looking to buy online instead?{" "}
          <Link href="/browse" className="text-matcha hover:text-forest underline">
            Search the full database
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
