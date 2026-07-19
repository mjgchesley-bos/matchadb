import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/db";
import { formatPrice, formatPriceVariant } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";

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
    <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{children}</p>
  );
}

// Distinguishes a brand's own disclosed number from a published-research
// estimate applied by cultivar or grade tier -- never shown as if they were
// the same kind of claim.
function compoundSourceLabel(source: string | null): string {
  if (source === "disclosed") return "Brand disclosed";
  if (source === "cultivar_research") return "Published research (cultivar)";
  if (source === "grade_research") return "Published research (grade estimate)";
  return "";
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
  const externalLink = getExternalLinkInfo(product.source_url);

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

      {(product.l_theanine_note || product.egcg_note) && (
        <section className="mt-10 bg-paper-raised/60 border border-line p-5">
          <SectionLabel>Health compounds</SectionLabel>
          <div className="flex flex-col gap-4">
            {product.l_theanine_note && (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink">L-theanine</span>
                  {product.l_theanine_mg_g != null && (
                    <span className="text-sm tabular-nums text-ink">
                      {product.l_theanine_mg_g.toFixed(1)} mg/g
                    </span>
                  )}
                  <span className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5 text-xs">
                    {compoundSourceLabel(product.l_theanine_source)}
                  </span>
                </div>
                <p className="text-xs text-ink-faint mt-1 leading-relaxed">{product.l_theanine_note}</p>
              </div>
            )}
            {product.egcg_note && (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink">EGCG</span>
                  {product.egcg_mg_g != null && (
                    <span className="text-sm tabular-nums text-ink">{product.egcg_mg_g.toFixed(1)} mg/g</span>
                  )}
                  <span className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5 text-xs">
                    {compoundSourceLabel(product.egcg_source)}
                  </span>
                </div>
                <p className="text-xs text-ink-faint mt-1 leading-relaxed">{product.egcg_note}</p>
              </div>
            )}
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
                    className="text-matcha hover:text-forest transition-colors text-xs"
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
