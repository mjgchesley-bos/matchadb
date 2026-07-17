import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/db";
import { formatPrice, formatPriceVariant } from "@/lib/price";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-[0.2em] uppercase text-matcha mb-3">{children}</p>
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

  const disclosedEntries = Object.entries(product.disclosed || {});

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
      <Link
        href={`/brands/${encodeURIComponent(product.brand_name)}`}
        className="text-sm text-ink-muted hover:text-matcha transition-colors"
      >
        &larr; {product.brand_name}
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-3 leading-tight">
        {product.product_name}
      </h1>

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

      {product.not_found === 1 && (
        <div className="mt-8 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <strong>Unverifiable:</strong> we could not locate a live, official page for this
          product during research. It may be discontinued, renamed, or the brand may not maintain
          a findable page for it. This entry is preserved for transparency rather than removed.
        </div>
      )}

      {product.contradictions.length > 0 && (
        <div className="mt-8 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5">
          <h2 className="font-semibold text-amber-900 dark:text-amber-300 mb-2.5 flex items-center gap-2">
            <span aria-hidden>&#9888;</span> Flagged inconsistencies on the brand&apos;s own page
          </h2>
          <ul className="list-disc list-inside text-sm text-amber-900 dark:text-amber-300 space-y-1.5">
            {product.contradictions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {product.source_url && (
        <p className="mt-7 text-sm">
          <a
            href={product.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-matcha hover:text-matcha-bright transition-colors"
          >
            View original product page &rarr;
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

      {product.secondarySources.length > 0 && (
        <section className="mt-12">
          <SectionLabel>Secondary sources</SectionLabel>
          <div className="flex flex-col gap-3">
            {product.secondarySources.map((s, i) => (
              <div key={i} className="border border-line bg-paper-raised/50 p-4 text-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-ink">{s.source_name}</span>
                  <span className="text-xs uppercase tracking-wide text-ink-faint">{s.source_type}</span>
                </div>
                <pre className="whitespace-pre-wrap text-ink-muted text-xs leading-relaxed">
                  {JSON.stringify(s.finding, null, 2)}
                </pre>
                {s.source_url && (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-matcha hover:text-matcha-bright transition-colors text-xs"
                  >
                    Source &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
