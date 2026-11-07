import type { Metadata } from "next";
import Link from "next/link";
import { CafeFinder } from "@/components/CafeFinder";
import { REGIONS, regionByKey } from "@/lib/cafe-regions";
import { getAllCafes } from "@/lib/cafes";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

const title = "Matcha Cafés Near Me: Find Cafés That Serve Matcha";
const description =
  "Find cafés near you whose own menu lists matcha, in the US, Canada, Europe, Japan and South Korea. Search by ZIP or postcode or use your location, see them on a map, read the menu evidence, and rate or review a café with photos.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/cafes` },
  openGraph: { title, description, url: `${SITE_URL}/cafes` },
};

export default async function CafesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const wanted = Array.isArray(sp.region) ? sp.region[0] : sp.region;
  const initial = regionByKey(wanted).key;
  const cafes = getAllCafes();
  const countries = new Set(cafes.map((c) => c.cc ?? "US")).size;
  const focused = cafes.filter((c) => c.focus).length;
  const covered = REGIONS.map((r) => r.label);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <header className="max-w-3xl mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Matcha cafés</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Matcha cafés near you</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          Cafés whose own website lists matcha. Pick a region, search by ZIP code, postcode or city or use your location, open a café to see where it mentions matcha, then rate it and share a photo of your drink.
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          {cafes.length.toLocaleString()} cafés in {countries} countries so far, {focused.toLocaleString()} of them matcha-focused. Covering {covered.slice(0, -1).join(", ")} and {covered[covered.length - 1]}. The list is new and growing.
        </p>
      </header>

      <CafeFinder contactEmail={CONTACT_EMAIL} initialRegion={initial} />

      <section className="mt-14 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-cafes">
        <h2 id="how-cafes" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">
          How this list is built
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          We start from open map data on cafés, coffee shops, boba shops and tea rooms. We then read each place&apos;s own website, its homepage and its menu, drinks and order pages, and list it only when that site says matcha
          (in English or the local language, including 抹茶 in Japan and 말차 in Korea). Each café page shows the page and the words we found, and the date we checked. A café that doesn&apos;t publish a menu online, or whose menu is only
          an image, won&apos;t appear yet, so a missing café doesn&apos;t mean it has no matcha.
        </p>
        <p className="mt-3 text-sm text-ink-muted leading-relaxed">
          We can&apos;t see what is in stock today, and menus change, so check the menu or call ahead. Large chains aren&apos;t on the map yet. Ratings and reviews come from MatchaDB members, and listing is not an endorsement. Spot a mistake or a
          missing café?{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MatchaDB café suggestion")}`} className="text-matcha hover:text-forest underline">
            Tell us
          </a>
          . Looking for matcha to buy and make at home?{" "}
          <Link href="/browse" className="text-matcha hover:text-forest underline">
            Search the full database
          </Link>
          .
        </p>
        <p className="mt-3 text-xs text-ink-faint">Place data: Overture Maps Foundation (CDLA Permissive 2.0), with contributions from Meta and Microsoft, among others.</p>
      </section>
    </main>
  );
}
