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
    <main className="flex-1 max-w-3xl mx-auto w-full p-6">
      <Link
        href={`/brands/${encodeURIComponent(product.brand_name)}`}
        className="text-sm text-green-700 dark:text-green-400 hover:underline"
      >
        &larr; {product.brand_name}
      </Link>

      <h1 className="text-3xl font-bold mt-2">{product.product_name}</h1>

      <div className="flex flex-wrap gap-2 mt-3">
        {product.grade && (
          <span className="rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 text-sm">
            {product.grade}
          </span>
        )}
        {product.cultivar && (
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm">
            Cultivar: {product.cultivar}
          </span>
        )}
        {product.region && (
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm">
            {product.region}
          </span>
        )}
        {product.organic_certified === 1 && (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-1 text-sm">
            Organic
          </span>
        )}
        {(() => {
          const price = formatPrice(product);
          const hasMultipleSizes = product.priceVariants.length > 1;
          if (price.kind === "unresolved") {
            return (
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-3 py-1 text-sm italic">
                Price not confirmed
              </span>
            );
          }
          return (
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                price.caution
                  ? "bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200"
                  : "bg-neutral-100 dark:bg-neutral-800"
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
        <section className="mt-4">
          <h2 className="text-sm font-medium text-neutral-500 mb-1">
            Pricing as disclosed on the product page
          </h2>
          <ul className="text-sm divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
            {product.priceVariants.map((v) => {
              const { text, caution } = formatPriceVariant(v);
              return (
                <li
                  key={v.id}
                  className={`py-2 ${caution ? "text-amber-800 dark:text-amber-300" : ""}`}
                >
                  {text}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {product.priceVariants.every((v) => v.needs_review === 1) && (
        <p className="mt-2 text-xs text-neutral-500">
          We couldn&apos;t confidently pin down a price and package size from this product&apos;s
          page — see the original page below for current pricing.
        </p>
      )}

      {product.not_found === 1 && (
        <div className="mt-6 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 text-sm text-red-800 dark:text-red-200">
          <strong>Unverifiable:</strong> we could not locate a live, official page for this
          product during research. It may be discontinued, renamed, or the brand may not maintain
          a findable page for it. This entry is preserved for transparency rather than removed.
        </div>
      )}

      {product.contradictions.length > 0 && (
        <div className="mt-6 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            ⚠ Flagged inconsistencies on the brand&apos;s own page
          </h2>
          <ul className="list-disc list-inside text-sm text-amber-900 dark:text-amber-200 space-y-1">
            {product.contradictions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {product.source_url && (
        <p className="mt-6 text-sm">
          <a
            href={product.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 dark:text-green-400 hover:underline"
          >
            View original product page &rarr;
          </a>
        </p>
      )}

      {disclosedEntries.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Everything disclosed on the product page</h2>
          <dl className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
            {disclosedEntries.map(([key, value]) => (
              <div key={key} className="py-3 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1">
                <dt className="text-sm font-medium text-neutral-500">{humanizeKey(key)}</dt>
                <dd className="text-sm whitespace-pre-wrap">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {product.page_notes && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Research notes</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{product.page_notes}</p>
        </section>
      )}

      {product.secondarySources.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Secondary sources</h2>
          <div className="flex flex-col gap-3">
            {product.secondarySources.map((s, i) => (
              <div
                key={i}
                className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{s.source_name}</span>
                  <span className="text-xs uppercase text-neutral-500">{s.source_type}</span>
                </div>
                <pre className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-400 text-xs">
                  {JSON.stringify(s.finding, null, 2)}
                </pre>
                {s.source_url && (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 dark:text-green-400 hover:underline text-xs"
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
