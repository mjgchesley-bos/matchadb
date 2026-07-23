import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandProducts } from "@/lib/db";
import { formatPrice } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { BrandLogo } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const brandName = decodeURIComponent(brand);
  const products = await getBrandProducts(brandName);
  if (products.length === 0) return {};

  const title = `${brandName} Matcha — ${products.length} Product${products.length === 1 ? "" : "s"}`;
  const description = `Pricing, sourcing, cultivar, and tasting-note data for every ${brandName} matcha product in MatchaDB's research database.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/brands/${encodeURIComponent(brandName)}` },
    openGraph: { title, description, url: `${SITE_URL}/brands/${encodeURIComponent(brandName)}` },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const brandName = decodeURIComponent(brand);
  const products = await getBrandProducts(brandName);

  if (products.length === 0) notFound();

  const brandUrl = `${SITE_URL}/brands/${encodeURIComponent(brandName)}`;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: brandName, item: brandUrl },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">
          MatchaDB
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint truncate">{brandName}</span>
      </nav>
      <div className="flex items-center gap-4 mt-3 mb-1.5">
        <BrandLogo brandName={brandName} size={56} />
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{brandName}</h1>
      </div>
      <p className="text-sm text-ink-muted mb-8">
        {products.length} product{products.length === 1 ? "" : "s"} in the database
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p) => {
          const link = getExternalLinkInfo(p.source_url);
          return (
            <div
              key={p.id}
              className="border border-line rounded-sm p-4 hover:border-matcha bg-paper-raised hover:bg-matcha-soft transition-colors flex flex-col gap-1"
            >
              <Link href={`/products/${p.id}`} className="flex flex-col gap-1">
                <span className="font-medium text-ink">{p.product_name}</span>
                {link && <span className="text-xs text-ink-faint truncate">{link.hostname}</span>}
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
                  {p.grade && (
                    <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">
                      {p.grade}
                    </span>
                  )}
                  {(JSON.parse(p.flavor_tags) as string[]).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                  {p.not_found === 1 && (
                    <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5">
                      unverifiable
                    </span>
                  )}
                </div>
                {(() => {
                  const price = formatPrice(p);
                  if (price.kind === "unresolved") {
                    return (
                      <span className="text-sm mt-1.5 text-ink-faint italic">
                        {p.source_url ? "See website for pricing" : "Price not confirmed"}
                      </span>
                    );
                  }
                  if (price.kind === "linkOnly") {
                    return (
                      <span className="text-sm mt-1.5 text-ink-faint italic">
                        Pricing on product page
                      </span>
                    );
                  }
                  return (
                    <span className="text-sm mt-1.5 tabular-nums text-ink">
                      {price.text}
                      {price.caution && <span className="text-amber-600 ml-1">&#9888;</span>}
                    </span>
                  );
                })()}
              </Link>
              {link && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-matcha hover:text-forest transition-colors mt-1.5"
                >
                  {link.label} &rarr;
                </a>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
