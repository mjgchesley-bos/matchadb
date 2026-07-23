import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/db";
import { formatPrice, formatPriceVariant } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { BrandLogo } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

function buildProductDescription(product: Awaited<ReturnType<typeof getProductById>>): string {
  if (!product) return "";
  const parts: string[] = [];
  parts.push(`${product.product_name} by ${product.brand_name}`);
  const details: string[] = [];
  if (product.grade) details.push(product.grade);
  if (product.region) details.push(`sourced from ${product.region}`);
  if (product.cultivar) details.push(`${product.cultivar} cultivar`);
  if (details.length > 0) parts.push(details.join(", "));
  const price = formatPrice(product);
  if (price.kind !== "unresolved" && price.kind !== "linkOnly") {
    parts.push(price.text + (product.price_per_gram != null ? ` (~$${product.price_per_gram.toFixed(2)}/g)` : ""));
  }
  return parts.join(" — ") + " — pricing, sourcing, and tasting notes on MatchaDB.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) return {};
  const product = await getProductById(productId);
  if (!product) return {};

  const title = `${product.product_name} by ${product.brand_name}`;
  const description = buildProductDescription(product);

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.id}` },
    openGraph: { title, description, url: `${SITE_URL}/products/${product.id}` },
  };
}

function formatValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// "disclosed" fields were extracted by many independent research passes
// over 728 different product pages, so the same two kinds of noise show up
// under dozens of different key spellings rather than one consistent name.
// Excluded here:
//  - page/listing titles -- just restate the product name already shown in
//    the H1 above, so they're pure duplication, not new information.
//  - SKUs / product codes -- a retailer inventory number, not something a
//    matcha shopper cares about.
// Deliberately NOT excluded: keys that merely contain "title" or "sku" as
// part of a different, genuinely informative field -- e.g. a Japanese-
// language product name, or brand claims that happen to reference a SKU --
// since those aren't redundant or irrelevant, just named loosely by
// whichever research pass wrote them.
const REDUNDANT_DISCLOSED_KEYS = new Set([
  "title",
  "subtitle",
  "page_title",
  "meta_title",
  "full_title",
  "full_title_on_page",
  "full_page_title",
  "listed_title",
  "listing_title",
  "amazon_listing_title",
  "amazon_us_listing_title",
  "canonical_page_title",
  "h1_page_title",
  "on_page_title",
  "official_title",
  "official_page_title",
  "official_product_title",
  "product_page_title",
  "product_title",
  "full_product_title",
  "full_listed_title",
  "full_listing_title",
  "full_name_as_listed_in_url_title",
  "page_title_tagline",
  "page_title_url_slug",
  "page_title_variants",
  "sku",
  "sku_field",
  "sku_1_pack",
  "sku_30g",
  "sku_80g",
  "product_code_sku",
  "related_sku_noted",
]);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{children}</p>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const product = await getProductById(productId);
  if (!product) notFound();

  const disclosedEntries = Object.entries(product.disclosed || {}).filter(
    ([key]) => !REDUNDANT_DISCLOSED_KEYS.has(key)
  );
  const externalLink = getExternalLinkInfo(product.source_url);
  const productUrl = `${SITE_URL}/products/${product.id}`;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.product_name,
          brand: { "@type": "Brand", name: product.brand_name },
          description: buildProductDescription(product),
          url: productUrl,
          ...(product.price_usd != null
            ? {
                offers: {
                  "@type": "Offer",
                  price: product.price_usd,
                  priceCurrency: "USD",
                  url: externalLink?.url ?? productUrl,
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: product.brand_name,
              item: `${SITE_URL}/brands/${encodeURIComponent(product.brand_name)}`,
            },
            { "@type": "ListItem", position: 3, name: product.product_name, item: productUrl },
          ],
        }}
      />
      <Link
        href={`/brands/${encodeURIComponent(product.brand_name)}`}
        className="text-sm text-ink-muted hover:text-matcha transition-colors"
      >
        &larr; {product.brand_name}
      </Link>

      <div className="flex items-center gap-3 mt-3">
        <BrandLogo brandName={product.brand_name} size={40} />
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight">
          {product.product_name}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {product.grade && (
          <span className="rounded-full bg-matcha-soft text-matcha-ink px-3 py-1 text-sm">
            {product.grade}
          </span>
        )}
        {product.cultivar && (
          <span className="rounded-full bg-paper-raised border border-line text-ink-muted px-3 py-1 text-sm">
            Cultivar: {product.cultivar}
          </span>
        )}
        {product.region && (
          <span className="rounded-full bg-paper-raised border border-line text-ink-muted px-3 py-1 text-sm">
            {product.region}
          </span>
        )}
        {product.organic_certified === 1 && (
          <span className="rounded-full bg-gold-soft text-gold px-3 py-1 text-sm">Organic</span>
        )}
        {product.flavorTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-3 py-1 text-sm"
          >
            {tag}
          </span>
        ))}
        {(() => {
          const price = formatPrice(product);
          const hasMultipleSizes = product.priceVariants.length > 1;
          if (price.kind === "unresolved") {
            return (
              <span className="rounded-full bg-paper-raised border border-line text-ink-faint px-3 py-1 text-sm italic">
                {product.source_url ? "See website for pricing" : "Price not confirmed"}
              </span>
            );
          }
          if (price.kind === "linkOnly") {
            return (
              <span className="rounded-full bg-paper-raised border border-line text-ink-faint px-3 py-1 text-sm italic">
                Pricing available on product page
              </span>
            );
          }
          return (
            <span
              className={`rounded-full px-3 py-1 text-sm tabular-nums ${
                price.caution
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300"
                  : "bg-paper-raised border border-line-strong text-ink"
              }`}
            >
              {hasMultipleSizes ? "From " : ""}
              {price.text}
              {product.price_per_gram != null ? ` (~$${product.price_per_gram.toFixed(2)}/g)` : ""}
              {price.caution && " ⚠ worth double-checking"}
            </span>
          );
        })()}
      </div>

      {product.priceVariants.length > 0 && (
        <section className="mt-8">
          <SectionLabel>Pricing as disclosed</SectionLabel>
          <ul className="text-sm divide-y divide-line border-t border-b border-line">
            {product.priceVariants.map((v) => {
              const { text, caution } = formatPriceVariant(v);
              return (
                <li
                  key={v.id}
                  className={`py-2.5 tabular-nums ${caution ? "text-amber-700 dark:text-amber-400" : "text-ink"}`}
                >
                  {text}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {product.price_link_only === 1 ? (
        <p className="mt-3 text-xs text-ink-faint">
          This product is priced by count (sticks, tea bags, or multi-pack bundles) rather than a
          package weight, so we don&apos;t show a computed per-gram figure — see the original page
          below for current pricing.
        </p>
      ) : product.price_usd != null && product.price_size_grams == null ? (
        <p className="mt-3 text-xs text-ink-faint">
          The price shown is confirmed, but this product&apos;s package size isn&apos;t stated
          anywhere on the page, so we can&apos;t show a per-gram figure.
        </p>
      ) : (
        product.priceVariants.length > 0 &&
        product.priceVariants.every((v) => v.needs_review === 1) && (
          <p className="mt-3 text-xs text-ink-faint">
            We couldn&apos;t confidently pin down a price and package size from this
            product&apos;s page — see the original page below for current pricing.
          </p>
        )
      )}

      {product.tasting_notes && (
        <section className="mt-10 bg-paper-raised/60 border border-line p-5">
          <SectionLabel>Tasting notes</SectionLabel>
          <div className="flex flex-col gap-2">
            {product.tasting_notes.split(" | ").map((line, i) => (
              <p key={i} className="text-sm text-ink leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </section>
      )}

      {product.not_found === 1 && (
        <div className="mt-8 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <strong>Unverifiable:</strong> we could not locate a live, official page for this
          product during research. It may be discontinued, renamed, or the brand may not maintain
          a findable page for it. This entry is preserved for transparency rather than removed.
        </div>
      )}

      {externalLink && (
        <p className="mt-7 text-sm">
          <a
            href={externalLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-matcha hover:text-forest transition-colors"
          >
            {externalLink.label} &rarr;
          </a>
        </p>
      )}

      {disclosedEntries.length > 0 && (
        <section className="mt-12">
          <SectionLabel>Everything disclosed on the product page</SectionLabel>
          <dl className="divide-y divide-line border-t border-b border-line">
            {disclosedEntries.map(([key, value]) => (
              <div key={key} className="py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1">
                <dt className="text-sm font-medium text-ink-faint">{humanizeKey(key)}</dt>
                <dd className="text-sm whitespace-pre-wrap text-ink">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {product.page_notes && (
        <section className="mt-8">
          <SectionLabel>Research notes</SectionLabel>
          <p className="text-sm text-ink-muted leading-relaxed">{product.page_notes}</p>
        </section>
      )}

    </main>
  );
}
