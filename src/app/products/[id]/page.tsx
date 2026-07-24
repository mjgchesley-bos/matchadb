import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, getRelatedProducts, getBrandProducts } from "@/lib/db";
import { formatPrice, formatPriceVariant } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { BrandLogo, ProductCard, gradeLabel } from "@/components/product-cards";
import { getBrandLogoPath } from "@/lib/logos";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

// Shared between the meta description and the on-page tagline under the
// product name -- same real facts (grade, region, cultivar), just two
// different renderings of one source of truth instead of two copies that
// can drift.
function buildFactsLine(product: Product): string | null {
  const details: string[] = [];
  if (product.grade) details.push(gradeLabel(product.grade));
  if (product.region) details.push(`sourced from ${product.region}`);
  if (product.cultivar) details.push(`${product.cultivar} cultivar`);
  return details.length > 0 ? details.join(", ") : null;
}

function buildProductDescription(product: Product | null): string {
  if (!product) return "";
  const parts: string[] = [`${product.product_name} by ${product.brand_name}`];
  const factsLine = buildFactsLine(product);
  if (factsLine) parts.push(factsLine);
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

// tasting_notes was consolidated from ~70 differently-named source fields
// (see the products table's own tasting_notes column comment), and roughly
// half the rows still carry that original field name as a literal leading
// "Label: " prefix in the text -- e.g. "Tasting Notes: Bright green,
// fresh..." Harmless in the old small-text list, but glaring now that this
// renders as a large quote. This is the exact, closed set of leading labels
// found across all 646 tasting_notes rows (checked directly against the
// database, not guessed) -- stripping only an exact match here can't eat
// real content that happens to contain a colon.
const TASTING_NOTES_NOISE_LABELS = new Set(
  [
    "Tasting Notes", "Flavor Profile", "Live Page Description", "Tasting Notes Aroma",
    "Tasting Notes Sazen", "Aroma", "Flavor Description", "Flavor Category",
    "Tasting Profile Taste", "Tasting Notes Flavor", "Flavor Description On Page",
    "Tasting Profile Flavor", "Tasting Profile", "Flavor Summary", "Tasting Notes Disclosed",
    "Tasting Emphasis", "Tasting Notes From Review Summary", "Tasting Notes Summary",
    "Flavor Profile Tags", "Taste Notes", "Tasting Notes Liquor Color", "Tasting Notes Color",
    "Aroma Per Reviewer", "Flavor", "Tasting Notes Koicha", "Tasting Notes Description",
    "Yunomi Tasting Score", "Tasting Scores Umami", "Tasting Scores Umami Strength",
    "Flavor Profile Tagline", "Additional Flavor Range Claim", "Flavor Profile General",
    "Appearance Texture", "Tasting Notes Per Secondary Review", "Tasting Notes Official Description",
    "Tasting Notes Official Page", "Flavor Claim", "Tasting Notes Primary Flavors",
    "Tasting Notes Dry Leaves", "Flavour Descriptor On Page", "Tasting Notes In The Cup",
    "Tasting Notes Descriptors", "Tasting Notes General", "Tasting Description", "Flavors Seen",
    "Taste", "Tasting And Benefit Description", "Flavor Lineup Referenced On Page",
    "Tasting Notes Chocolate", "Tasting Notes Mango", "Tasting Notes Per Reviewer",
    "Tasting Notes Descriptor", "Tasting Method Note", "Aroma Taste",
    "Flavor Profile Gauges Umami", "Tasting Notes Flavor Description", "Flavor Profile Ratings Body",
    "Site Search Evidence Of Other Flavors", "Tasting Notes Descriptive", "Third Party Tasting Notes",
    "Taste Per Reviewer",
  ].map((s) => s.toLowerCase())
);

function stripTastingNotesLabel(line: string): string {
  const match = line.match(/^([^:]{2,50}):\s*/);
  if (match && TASTING_NOTES_NOISE_LABELS.has(match[1].trim().toLowerCase())) {
    return line.slice(match[0].length);
  }
  return line;
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
    <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{children}</h2>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
      <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

// grade_research/cultivar_research are real published lab measurements for
// matcha of that grade or cultivar in general -- not a lab result for this
// specific tin -- so the label always says "estimate," never states it as
// this product's own measured value.
function compoundSourceLabel(source: string | null | undefined): string {
  if (source === "disclosed") return "As stated on the brand's own product page";
  if (source === "cultivar_research") return "Published estimate for this cultivar";
  if (source === "grade_research") return "Published estimate for this grade";
  return "";
}

function CompoundCard({
  label,
  mgPerGram,
  source,
  note,
}: {
  label: string;
  mgPerGram: number | null | undefined;
  source: string | null | undefined;
  note: string | null | undefined;
}) {
  if (!note) return null;
  return (
    <div className="border border-line rounded-sm bg-paper-raised p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-1.5">
        {label}
      </p>
      {mgPerGram != null ? (
        <p className="text-2xl font-display font-semibold text-ink tabular-nums">
          {mgPerGram} <span className="text-sm font-sans font-normal text-ink-muted">mg/g</span>
        </p>
      ) : (
        <p className="text-sm text-ink">{note}</p>
      )}
      <p className="text-xs text-ink-faint mt-2 leading-relaxed">
        {compoundSourceLabel(source)}
        {mgPerGram != null ? ` — ${note}` : ""}
      </p>
    </div>
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
  const logoPath = getBrandLogoPath(product.brand_name);
  const factsLine = buildFactsLine(product);
  const hasCompounds = Boolean(product.l_theanine_note || product.egcg_note);

  const stats: { label: string; value: string }[] = [];
  if (product.grade) stats.push({ label: "Grade", value: gradeLabel(product.grade) });
  if (product.cultivar) stats.push({ label: "Cultivar", value: product.cultivar });
  if (product.region) stats.push({ label: "Region", value: product.region });
  if (product.organic_certified === 1) stats.push({ label: "Certification", value: "Organic" });

  const [relatedProducts, brandProducts] = await Promise.all([
    getRelatedProducts({ id: product.id, region: product.region, grade: product.grade }, 4),
    getBrandProducts(product.brand_name),
  ]);
  const moreFromBrand = brandProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
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
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">
          MatchaDB
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/brands/${encodeURIComponent(product.brand_name)}`}
          className="hover:text-matcha transition-colors"
        >
          {product.brand_name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint truncate">{product.product_name}</span>
      </nav>

      {/* Hero: a brand-identity panel (never a fabricated product photo --
          we don't have real photography for any of these 714 products) plus
          title, price, and the primary action, in place of the old flat
          badge row. */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
        <div
          className="relative w-full aspect-[4/5] rounded-md border border-line-strong overflow-hidden flex flex-col items-center justify-center gap-4 p-8 text-center"
          style={{
            background:
              "radial-gradient(circle at 30% 18%, var(--color-matcha-soft) 0%, var(--color-paper-raised) 68%)",
          }}
        >
          {logoPath ? (
            <BrandLogo brandName={product.brand_name} size={72} maxWidth={220} />
          ) : (
            <span className="font-display text-2xl font-semibold text-ink px-2 leading-snug">
              {product.brand_name}
            </span>
          )}
          {product.grade && (
            <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-matcha-ink/70">
              {gradeLabel(product.grade)}
            </span>
          )}
        </div>

        <div>
          <p className="text-sm text-ink-muted">
            <Link
              href={`/brands/${encodeURIComponent(product.brand_name)}`}
              className="hover:text-matcha transition-colors"
            >
              {product.brand_name}
            </Link>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight mt-1">
            {product.product_name}
          </h1>
          {factsLine && <p className="text-ink-muted mt-2">{factsLine}</p>}

          {product.flavorTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {product.flavorTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2.5 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(() => {
            const price = formatPrice(product);
            const hasMultipleSizes = product.priceVariants.length > 1;
            if (price.kind === "unresolved") {
              return (
                <p className="mt-5 text-ink-faint italic">
                  {product.source_url ? "See website for pricing" : "Price not confirmed"}
                </p>
              );
            }
            if (price.kind === "linkOnly") {
              return <p className="mt-5 text-ink-faint italic">Pricing available on product page</p>;
            }
            return (
              <div className="mt-5">
                <p
                  className={`text-3xl font-display font-semibold tabular-nums ${
                    price.caution ? "text-amber-400" : "text-ink"
                  }`}
                >
                  {hasMultipleSizes ? "From " : ""}
                  {price.text}
                </p>
                {product.price_per_gram != null && (
                  <p className="text-sm text-ink-muted mt-1">
                    ~${product.price_per_gram.toFixed(2)} per gram
                  </p>
                )}
                {price.caution && (
                  <p className="text-xs text-amber-400 mt-1">⚠ worth double-checking against the source</p>
                )}
              </div>
            );
          })()}

          {product.price_link_only === 1 ? (
            <p className="mt-2 text-xs text-ink-faint">
              Priced by count (sticks, tea bags, or multi-pack bundles) rather than a package
              weight, so there&apos;s no comparable per-gram figure here.
            </p>
          ) : product.price_usd != null && product.price_size_grams == null ? (
            <p className="mt-2 text-xs text-ink-faint">
              The price is confirmed, but package size isn&apos;t stated anywhere on the page, so
              we can&apos;t show a per-gram figure.
            </p>
          ) : (
            product.priceVariants.length > 0 &&
            product.priceVariants.every((v) => v.needs_review === 1) && (
              <p className="mt-2 text-xs text-ink-faint">
                We couldn&apos;t confidently pin down a price and package size from this
                product&apos;s page.
              </p>
            )
          )}

          {externalLink && (
            <a
              href={externalLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              {externalLink.label} &rarr;
            </a>
          )}

          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-7">
              {stats.map((s) => (
                <StatCard key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          )}
        </div>
      </div>

      {product.not_found === 1 && (
        <div className="mt-8 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <strong>Unverifiable:</strong> we could not locate a live, official page for this
          product during research. It may be discontinued, renamed, or the brand may not maintain
          a findable page for it. This entry is preserved for transparency rather than removed.
        </div>
      )}

      {product.tasting_notes && (
        <section className="mt-12">
          <SectionLabel>Tasting notes</SectionLabel>
          <div className="border-l-2 border-matcha bg-paper-raised/60 pl-5 py-4 pr-5 flex flex-col gap-2.5">
            {product.tasting_notes.split(" | ").map((line, i) => (
              <p key={i} className="font-display text-lg text-ink leading-relaxed">
                {stripTastingNotesLabel(line)}
              </p>
            ))}
          </div>
        </section>
      )}

      {hasCompounds && (
        <section className="mt-12">
          <SectionLabel>Composition</SectionLabel>
          <p className="text-sm text-ink-muted mb-4 max-w-xl">
            L-theanine (a calming, umami-sweet amino acid) and EGCG (a bitter antioxidant
            catechin) are the two compounds most associated with matcha&apos;s characteristic
            taste and effects.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CompoundCard
              label="L-theanine"
              mgPerGram={product.l_theanine_mg_g}
              source={product.l_theanine_source}
              note={product.l_theanine_note}
            />
            <CompoundCard
              label="EGCG"
              mgPerGram={product.egcg_mg_g}
              source={product.egcg_source}
              note={product.egcg_note}
            />
          </div>
        </section>
      )}

      {product.priceVariants.length > 0 && (
        <section className="mt-12">
          <SectionLabel>Pricing as disclosed</SectionLabel>
          <div className="flex flex-col gap-2">
            {product.priceVariants.map((v) => {
              const { text, caution } = formatPriceVariant(v);
              return (
                <div
                  key={v.id}
                  className={`border rounded-sm px-4 py-2.5 text-sm tabular-nums ${
                    caution
                      ? "border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-line bg-paper-raised text-ink"
                  }`}
                >
                  {text}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {disclosedEntries.length > 0 && (
        <section className="mt-12">
          <SectionLabel>Full details</SectionLabel>
          <details className="group border border-line rounded-sm bg-paper-raised">
            <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm text-ink-muted flex items-center justify-between">
              <span>
                Everything disclosed on the product page ({disclosedEntries.length} field
                {disclosedEntries.length === 1 ? "" : "s"})
              </span>
              <span className="text-ink-faint transition-transform group-open:rotate-180">&#9662;</span>
            </summary>
            <dl className="divide-y divide-line border-t border-line px-4">
              {disclosedEntries.map(([key, value]) => (
                <div key={key} className="py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1">
                  <dt className="text-sm font-medium text-ink-faint">{humanizeKey(key)}</dt>
                  <dd className="text-sm whitespace-pre-wrap text-ink">{formatValue(value)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>
      )}

      {product.page_notes && (
        <section className="mt-8">
          <SectionLabel>Research notes</SectionLabel>
          <p className="text-sm text-ink-muted leading-relaxed">{product.page_notes}</p>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <SectionLabel>
            {product.region && product.grade
              ? `More ${product.grade} matcha from ${product.region}`
              : product.region
                ? `More matcha from ${product.region}`
                : `More ${product.grade} matcha`}
          </SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {moreFromBrand.length > 0 && (
        <section className="mt-12">
          <SectionLabel>More from {product.brand_name}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moreFromBrand.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Link
            href={`/brands/${encodeURIComponent(product.brand_name)}`}
            className="inline-block mt-4 text-sm text-matcha hover:text-forest transition-colors"
          >
            View all {product.brand_name} products &rarr;
          </Link>
        </section>
      )}
    </main>
  );
}
