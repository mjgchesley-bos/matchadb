import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { SUPPLIERS, verifiedOn } from "@/lib/suppliers";

const title = "Wholesale Matcha Suppliers (B2B Directory)";
const description =
  "Bulk and wholesale matcha suppliers for cafés, food and beverage brands and private-label customers, with minimum orders, origins and certifications as each supplier states them.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/wholesale` },
  openGraph: { title, description, url: `${SITE_URL}/wholesale` },
};

export default function WholesalePage() {
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
              url: `${SITE_URL}/wholesale/${s.slug}`,
              name: s.name,
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
          Where cafés, food and beverage brands and private-label customers can source matcha in bulk. The main
          database compares products you can buy off the shelf; this directory covers suppliers who sell by the
          kilogram, with the terms they publish.
        </p>
        <p className="mt-4 text-sm text-ink-muted leading-relaxed">
          Wholesale prices are usually quoted privately, so none are shown here. Each listing links to the
          supplier&apos;s own price request page. Everything listed is what the supplier says on its own website; we
          haven&apos;t tested the products or checked the certificates, so confirm anything that matters for your
          business directly with them.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SUPPLIERS.map((s) => (
          <Link
            key={s.slug}
            href={`/wholesale/${s.slug}`}
            className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors"
          >
            <span className="font-display text-xl font-semibold text-ink block">{s.name}</span>
            <span className="text-xs text-ink-faint mt-1 block">
              {s.hq} &middot; sources from {s.origins.join(" and ")}
            </span>
            <span className="text-sm text-ink-muted mt-3 block leading-relaxed">{s.summary}</span>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-faint">Minimum order</dt>
              <dd className="text-ink">{s.minimumOrder}</dd>
              <dt className="text-ink-faint">Grades</dt>
              <dd className="text-ink">{s.organic}</dd>
            </dl>
            <span className="text-xs text-ink-faint mt-4 block">Checked {verifiedOn(s)}</span>
          </Link>
        ))}
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
