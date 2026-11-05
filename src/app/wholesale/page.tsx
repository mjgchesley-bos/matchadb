import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { WholesaleDirectory } from "@/components/WholesaleDirectory";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { SUPPLIERS } from "@/lib/suppliers";

const title = "Wholesale & Bulk Matcha Suppliers";
const description =
  "Wholesale and bulk matcha programs for cafés, shops, food and drink makers and private-label brands, with minimum orders and how to apply, as each supplier states them.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/wholesale` },
  openGraph: { title, description, url: `${SITE_URL}/wholesale` },
};

export default function WholesalePage() {
  const brandCount = new Set(SUPPLIERS.flatMap((s) => s.brands)).size;
  const fromBrands = SUPPLIERS.filter((s) => s.brands.length > 0).length;
  const independent = SUPPLIERS.length - fromBrands;
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Wholesale matcha suppliers",
          url: `${SITE_URL}/wholesale`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: SUPPLIERS.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: s.name,
              url: s.profile ? `${SITE_URL}/wholesale/${s.slug}` : `${SITE_URL}/wholesale#${s.slug}`,
            })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Wholesale</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">
          Wholesale matcha suppliers
        </h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          Where cafés, shops, food and drink makers and new brands can buy matcha in bulk. We checked every brand in the
          database for a wholesale or trade program. {fromBrands} sellers have one, covering {brandCount} of the
          brands in the main database, and we&apos;ve added {independent} independent bulk supplier{independent === 1 ? "" : "s"}.
        </p>
        <p className="mt-4 text-sm text-ink-muted leading-relaxed">
          Wholesale prices are usually quoted privately, so none are shown here (a few suppliers publish some
          prices, noted on their listing). Each listing links to the supplier&apos;s own wholesale page. Everything is
          what the supplier says on its own website; we haven&apos;t tested the products or checked the
          certificates, and programs change, so confirm the terms with the supplier. Some programs are invite-only,
          have waitlists or are limited to one country, as noted. Listings are not endorsements.
        </p>
      </header>

      <div className="mt-8">
        <WholesaleDirectory suppliers={SUPPLIERS} />
      </div>

      <section className="mt-14 max-w-3xl" aria-labelledby="list-h">
        <h2 id="list-h" className="font-display text-2xl font-semibold text-ink">
          Are you a matcha supplier?
        </h2>
        <p className="mt-3 text-ink-muted leading-relaxed">
          We list wholesale suppliers of matcha and related powders such as hojicha. To be listed, you need a public
          website that states what you sell, where it comes from and your ordering terms. We write the listing from
          your own pages and show when we last checked them. Listing is free, and nobody can pay to be included or to
          change what is shown. If something on your listing is out of date, tell us and we will check it against your
          site.
        </p>
        <p className="mt-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Wholesale%20listing%20request`}
            className="inline-flex items-center rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest"
          >
            Request a listing
          </a>
        </p>
      </section>
    </main>
  );
}
