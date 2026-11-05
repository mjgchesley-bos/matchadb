import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { SUPPLIERS, supplierBySlug, verifiedOn } from "@/lib/suppliers";

export function generateStaticParams() {
  return SUPPLIERS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = supplierBySlug(slug);
  if (!s) return {};
  const url = `${SITE_URL}/wholesale/${s.slug}`;
  const title = `${s.name}: Wholesale Matcha Supplier`;
  const description = `${s.name} (${s.hq}) supplies bulk matcha from ${s.origins.join(" and ")}. ${s.minimumOrder}. Terms and certifications as the supplier states them.`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

export default async function SupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = supplierBySlug(slug);
  if (!s) notFound();
  const url = `${SITE_URL}/wholesale/${s.slug}`;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Based in", value: s.hq },
    { label: "Sources from", value: s.origins.join(" and ") },
    { label: "Grades", value: s.organic },
    { label: "Minimum order", value: s.minimumOrder },
    { label: "Documentation", value: s.documentation },
    { label: "Samples", value: s.samples },
    { label: "Private label", value: s.privateLabel },
    { label: "Shipping", value: s.shipping },
    { label: "Pricing", value: s.pricing },
    { label: "Sells to", value: s.customers },
  ];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: s.name,
          url: s.website,
          description: s.summary,
          address: { "@type": "PostalAddress", addressLocality: s.hq.split(",")[0].trim(), addressCountry: s.hq.split(",").pop()?.trim() },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Wholesale", item: `${SITE_URL}/wholesale` },
            { "@type": "ListItem", position: 3, name: s.name, item: url },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">MatchaDB</Link>
        <span aria-hidden="true">/</span>
        <Link href="/wholesale" className="hover:text-matcha transition-colors">Wholesale</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint">{s.name}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Wholesale supplier</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight text-balance">{s.name}</h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">{s.summary}</p>
        <p className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={s.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest"
          >
            Visit {s.name}
          </a>
          {s.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-matcha-soft"
            >
              {l.label}
            </a>
          ))}
        </p>
      </header>

      <section className="mt-10" aria-labelledby="terms-h">
        <h2 id="terms-h" className="font-display text-xl font-semibold text-ink">Terms as the supplier states them</h2>
        <dl className="mt-4 border-y border-line divide-y divide-line">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-6 gap-y-1 py-3">
              <dt className="text-sm text-ink-faint">{r.label}</dt>
              <dd className="text-ink leading-relaxed">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Products</h2>
          <ul className="mt-3 list-disc pl-5 flex flex-col gap-1.5 text-ink-muted">
            {s.products.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Certifications listed</h2>
          <ul className="mt-3 list-disc pl-5 flex flex-col gap-1.5 text-ink-muted">
            {s.certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 rounded-sm border border-line bg-paper-raised px-5 py-4 text-sm text-ink-muted leading-relaxed">
        <p>
          <strong className="text-ink">Where this comes from.</strong> Everything above is what {s.name} says on its
          own website, last checked {verifiedOn(s)}:{" "}
          {s.sources.map((src, i) => (
            <span key={src.url}>
              {i > 0 && ", "}
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-matcha underline hover:text-forest">
                {src.label}
              </a>
            </span>
          ))}
          . MatchaDB has not tested the products or verified the certificates, and a listing is not an endorsement.
          Confirm details with the supplier before you order. Spot something out of date?{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Wholesale%20listing%20update:%20${encodeURIComponent(s.name)}`} className="text-matcha underline hover:text-forest">
            Tell us
          </a>
          .
        </p>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/wholesale" className="text-matcha hover:text-forest">&larr; All wholesale suppliers</Link>
      </p>
    </main>
  );
}
