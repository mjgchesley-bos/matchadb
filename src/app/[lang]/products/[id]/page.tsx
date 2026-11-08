import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { getProductById, getRelatedProducts, getBrandProducts, getComparablePrices } from "@/lib/db";
import { getPriceInsight } from "@/lib/product-insight";
import { formatPrice, formatPriceVariant } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { BrandLogo, gradeLabel } from "@/components/product-cards";
import { ProductCard } from "@/components/ProductCard";
import { getBrandLogoPath } from "@/lib/logos";
import { getRegionInfo, regionCountry } from "@/lib/regions";
import { REGION_CONTENT } from "@/lib/region-content";
import { cultivarSlugFor } from "@/lib/cultivars";
import { JsonLd } from "@/components/JsonLd";
import { ResearchLinks } from "@/components/ResearchLinks";
import { ShippingNote } from "@/components/ShippingNote";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ProductRating } from "@/components/ProductRating";
import { ListMenu } from "@/components/ListMenu";
import { ShelfButtons } from "@/components/ShelfButtons";
import { Comments } from "@/components/Comments";
import { ProductReviews } from "@/components/ProductReviews";
import { usd30 } from "@/lib/unit-price";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT, getTV, type TFn, type TVFn } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

// Shared between the meta description and the on-page tagline under the
// product name -- same real facts (grade, region, cultivar), just two
// different renderings of one source of truth instead of two copies that
// can drift.
function buildFactsLine(product: Product, t: TFn, tv: TVFn, lang: Locale): string | null {
  const details: string[] = [];
  if (product.grade) details.push(gradeLabel(product.grade, tv));
  if (product.region) details.push(t("prod.facts.region", { region: tv("region", product.region) }));
  if (product.cultivar) details.push(t("prod.facts.cultivar", { cultivar: product.cultivar }));
  return details.length > 0 ? details.join(lang === "ja" || lang === "zh" ? "、" : ", ") : null;
}

function buildProductDescription(product: Product | null, t: TFn, tv: TVFn, lang: Locale, insightClause?: string): string {
  if (!product) return "";
  const parts: string[] = [t("prod.desc.by", { product: product.product_name, brand: product.brand_name })];
  const factsLine = buildFactsLine(product, t, tv, lang);
  if (factsLine) parts.push(factsLine);
  const price = formatPrice(product);
  if (price.kind === "resolved") parts.push(price.text);
  if (insightClause) parts.push(insightClause);
  const body = parts.join(" — ");
  const tail = t("prod.desc.tail");
  const text = body.length + tail.length <= 160 ? body + tail : body + ".";
  // Google shows roughly 160 characters; cut on a word boundary, not mid-word.
  return text.length > 160 ? text.slice(0, 157).replace(/\s+\S*$/, "") + "…" : text;
}

// People search for "<product> matcha", and the product name alone often
// doesn't say "matcha" (e.g. "Hukuju"). The layout appends " | MatchaDB" (11
// chars); keep the whole title near 60 characters so it isn't truncated.
function buildProductTitle(product: Product, t: TFn): string {
  const hasMatcha = /matcha|抹茶|말차|맛차/i.test(product.product_name);
  const base = t(hasMatcha ? "prod.title.plain" : "prod.title.matcha", { product: product.product_name, brand: product.brand_name });
  const suffix = t("prod.title.suffix");
  return base.length + suffix.length + 11 <= 60 ? base + suffix : base;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { id, lang: rawLang } = await params;
  const lang: Locale = isLocale(rawLang) ? rawLang : "en";
  const t = getT(lang);
  const tv = getTV(lang);
  const productId = Number(id);
  if (!Number.isFinite(productId)) return {};
  const product = await getProductById(productId);
  if (!product) return {};

  const insight = getPriceInsight(product.id, await getComparablePrices(), lang, t, tv);
  const title = buildProductTitle(product, t);
  const description = buildProductDescription(product, t, tv, lang, insight?.shortClause);
  const alternates = pageAlternates(lang, `/products/${product.id}`);

  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical },
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
// found across every line of every one of the 646 tasting_notes rows, after
// splitting on " | " the same way the renderer below does -- checking only
// the string's first segment (an earlier pass here) missed labels that
// leak in on a later line, e.g. "Tasting Notes Texture:" as the second of
// three " | "-joined lines. Stripping only an exact match here can't eat
// real content that happens to contain a colon.
const TASTING_NOTES_NOISE_LABELS = new Set(
  [
    "Additional Flavor Description", "Additional Flavor Notes From Reviews", "Additional Flavor Range Claim",
    "Appearance Aroma", "Appearance Texture", "Aroma", "Aroma Level Rating", "Aroma Per Reviewer",
    "Aroma Taste", "Body Umami", "Customer Review Tasting Notes", "Flavor", "Flavor Category",
    "Flavor Claim", "Flavor Comparison", "Flavor Description", "Flavor Description On Page",
    "Flavor Descriptors", "Flavor Lineup Referenced On Page", "Flavor Notes", "Flavor Profile",
    "Flavor Profile Astringency", "Flavor Profile Chart Axes", "Flavor Profile Gauges Astringency",
    "Flavor Profile Gauges Sweetness", "Flavor Profile Gauges Umami", "Flavor Profile General",
    "Flavor Profile Ratings Body", "Flavor Profile Ratings Grassiness", "Flavor Profile Ratings Sweetness",
    "Flavor Profile Ratings Umami", "Flavor Profile Sweetness", "Flavor Profile Tagline",
    "Flavor Profile Tags", "Flavor Profile Umami", "Flavor Summary", "Flavors Seen",
    "Flavour Descriptor On Page", "Live Page Description", "Mouthfeel", "Official Site Taste Index",
    "Site Search Evidence Of Other Flavors", "Sweetness Level", "Taste", "Taste Notes",
    "Taste Per Reviewer", "Tasting And Benefit Description", "Tasting Description", "Tasting Emphasis",
    "Tasting Method Note", "Tasting Notes", "Tasting Notes Additional", "Tasting Notes Appearance",
    "Tasting Notes Aroma", "Tasting Notes Aromas", "Tasting Notes Body", "Tasting Notes Character",
    "Tasting Notes Chocolate", "Tasting Notes Color", "Tasting Notes Comparison",
    "Tasting Notes Description", "Tasting Notes Descriptive", "Tasting Notes Descriptor",
    "Tasting Notes Descriptors", "Tasting Notes Detail", "Tasting Notes Disclosed",
    "Tasting Notes Dry Leaves", "Tasting Notes Flavor", "Tasting Notes Flavor Description",
    "Tasting Notes Flavor Details", "Tasting Notes From Review Summary", "Tasting Notes General",
    "Tasting Notes General Web", "Tasting Notes In The Cup", "Tasting Notes Koicha",
    "Tasting Notes Latte", "Tasting Notes Liquor", "Tasting Notes Liquor Appearance",
    "Tasting Notes Liquor Color", "Tasting Notes Mango", "Tasting Notes Notes",
    "Tasting Notes Official Description", "Tasting Notes Official Page", "Tasting Notes Official Site",
    "Tasting Notes Overall", "Tasting Notes Per Reviewer", "Tasting Notes Per Secondary Review",
    "Tasting Notes Primary Flavors", "Tasting Notes Producer Notes", "Tasting Notes Profile",
    "Tasting Notes Retailer Description", "Tasting Notes Sazen", "Tasting Notes Strength",
    "Tasting Notes Summary", "Tasting Notes Taste", "Tasting Notes Texture",
    "Tasting Notes Ujichamatcha", "Tasting Notes Usucha", "Tasting Profile", "Tasting Profile Aroma",
    "Tasting Profile Body", "Tasting Profile Finish", "Tasting Profile Flavor",
    "Tasting Profile Length", "Tasting Profile Mouthfeel", "Tasting Profile Taste",
    "Tasting Profile Texture", "Tasting Scores Astringency", "Tasting Scores Color",
    "Tasting Scores Detail Something Special", "Tasting Scores Detail Sweetness",
    "Tasting Scores Detail Test Parameters", "Tasting Scores Detail Umami", "Tasting Scores Texture",
    "Tasting Scores Umami", "Tasting Scores Umami Strength", "Texture", "Texture Appearance",
    "Texture Color", "Texture Quality", "Third Party Tasting Notes", "Umami Claim",
    "Yunomi Tasting Score",
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

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
      <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-ink">
        {href ? (
          <Link href={href} className="text-matcha hover:text-forest underline decoration-line-strong underline-offset-2">
            {value}
          </Link>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

// note already fully self-describes its own provenance -- e.g. "Ceremonial-
// grade published estimate -- Goto et al., ..." or "Disclosed on the
// brand's own product page: 27-40mg" (see scripts/compounds-extract.mjs) --
// so it's shown as-is rather than behind a second, redundant label restating
// the same thing in different words (grade_research/cultivar_research are
// real published lab measurements for matcha of that grade or cultivar in
// general, never this specific tin's own measured value -- but the note
// text already says that itself).
function CompoundCard({
  label,
  mgPerGram,
  note,
}: {
  label: string;
  mgPerGram: number | null | undefined;
  note: string | null | undefined;
}) {
  if (!note) return null;
  return (
    <div className="border border-line rounded-sm bg-paper-raised p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-1.5">
        {label}
      </p>
      {mgPerGram != null && (
        <p className="text-2xl font-display font-semibold text-ink tabular-nums">
          {mgPerGram} <span className="text-sm font-sans font-normal text-ink-muted">mg/g</span>
        </p>
      )}
      <p className="text-xs text-ink-faint mt-2 leading-relaxed">{note}</p>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const product = await getProductById(productId);
  if (!product) notFound();

  const disclosedEntries = Object.entries(product.disclosed || {}).filter(
    ([key]) => !REDUNDANT_DISCLOSED_KEYS.has(key)
  );
  const externalLink = getExternalLinkInfo(product.source_url);
  const productUrl = pageAlternates(lang, `/products/${product.id}`).canonical;
  const logoPath = getBrandLogoPath(product.brand_name);
  const factsLine = buildFactsLine(product, t, tv, lang);
  const hasCompounds = Boolean(product.l_theanine_note || product.egcg_note);
  const regionInfo = getRegionInfo(product.region);
  const insight = getPriceInsight(product.id, await getComparablePrices(), lang, t, tv);

  const stats: { label: string; value: string; href?: string }[] = [];
  if (product.grade) stats.push({ label: t("prod.stat.grade"), value: gradeLabel(product.grade, tv) });
  if (product.cultivar) {
    const cultivarSlug = cultivarSlugFor(product.cultivar);
    stats.push({ label: t("prod.stat.cultivar"), value: product.cultivar, href: cultivarSlug ? `/cultivars/${cultivarSlug}` : undefined });
  }
  if (product.region) {
    const regionContent = REGION_CONTENT[product.region];
    stats.push({
      label: t("prod.stat.region"),
      value: tv("region", product.region),
      href: regionContent ? `/regions/${regionContent.slug}` : undefined,
    });
  }
  if (product.organic_certified === 1) stats.push({ label: t("prod.stat.cert"), value: t("prod.stat.organic") });

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
          description: buildProductDescription(product, t, tv, lang, insight?.shortClause),
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
      <nav aria-label={t("prod.crumb.aria")} className="flex items-center gap-1.5 text-sm text-ink-muted">
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
            <BrandLogo brandName={product.brand_name} size={72} maxWidth={220} allowTallerThanSize />
          ) : (
            <span className="font-display text-2xl font-semibold text-ink px-2 leading-snug">
              {product.brand_name}
            </span>
          )}
          {product.grade && (
            <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-matcha-ink/70">
              {gradeLabel(product.grade, tv)}
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
          <ProductRating productId={product.id} productName={product.product_name} />
          <FavoriteButton productId={product.id} productName={product.product_name} />
          <ShelfButtons productId={product.id} productName={product.product_name} />
          <ListMenu productId={product.id} productName={product.product_name} />
          <ShippingNote brand={product.brand_name} lang={lang} />

          {product.flavorTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {product.flavorTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2.5 py-0.5 text-xs"
                >
                  {tv("flavor", tag)}
                </span>
              ))}
            </div>
          )}

          {(() => {
            const price = formatPrice(product, t("price.converted"));
            const hasMultipleSizes = product.priceVariants.length > 1;
            if (price.kind === "unresolved") {
              return (
                <p className="mt-5 text-ink-faint italic">
                  {product.source_url ? t("prod.price.seeSite") : t("prod.price.notConfirmed")}
                </p>
              );
            }
            if (price.kind === "linkOnly") {
              return <p className="mt-5 text-ink-faint italic">{t("prod.price.onPage")}</p>;
            }
            return (
              <div className="mt-5">
                <p
                  className={`text-3xl font-display font-semibold tabular-nums ${
                    price.caution ? "text-amber-400" : "text-ink"
                  }`}
                >
                  {hasMultipleSizes ? t("prod.price.from") : ""}
                  {price.text}
                </p>
                {product.price_per_gram != null && (
                  <p className="text-sm text-ink-muted mt-1">
                    {t("prod.price.per30", { price: usd30(product.price_per_gram) })} <span className="text-ink-faint">{t("prod.price.per30note")}</span>
                  </p>
                )}
                {price.caution && (
                  <p className="text-xs text-amber-400 mt-1">{t("prod.price.doubleCheck")}</p>
                )}
              </div>
            );
          })()}

          {product.price_link_only === 1 ? (
            <p className="mt-2 text-xs text-ink-faint">
              {t("prod.price.byCount")}
            </p>
          ) : product.price_usd != null && product.price_size_grams == null ? (
            <p className="mt-2 text-xs text-ink-faint">
              {t("prod.price.noSize")}
            </p>
          ) : (
            product.priceVariants.length > 0 &&
            product.priceVariants.every((v) => v.needs_review === 1) && (
              <p className="mt-2 text-xs text-ink-faint">
                {t("prod.price.unsure")}
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
              {externalLink.amazon ? t("prod.link.amazon") : t("prod.link.view")} &rarr;
            </a>
          )}

          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-7">
              {stats.map((s) => (
                <StatCard key={s.label} label={s.label} value={s.value} href={s.href} />
              ))}
            </div>
          )}
        </div>
      </div>

      {product.not_found === 1 && (
        <div className="mt-8 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <strong>{t("prod.unverifiable.label")}</strong> {t("prod.unverifiable.body")}
        </div>
      )}

      {insight && (
        <section className="mt-12">
          <SectionLabel>{t("prod.sec.context")}</SectionLabel>
          <p className="text-ink-muted leading-relaxed max-w-2xl">{insight.sentences.join(" ")}</p>
          <p className="text-xs text-ink-faint mt-3 max-w-2xl">
            {t("prod.ctx.basis", { n: insight.basis })}{" "}
            {insight.regionSlug && (
              <>
                <Link href={`/regions/${insight.regionSlug}`} className="underline">
                  {t("prod.ctx.region", { region: tv("region", product.region ?? "") })}
                </Link>
                {" · "}
              </>
            )}
            <Link href="/about" className="underline">
              {t("prod.ctx.how")}
            </Link>
          </p>
        </section>
      )}

      {regionInfo && (
        <section className="mt-12">
          <SectionLabel>{t("prod.sec.sourcing")}</SectionLabel>
          <div className="relative w-full max-w-md aspect-[8/5] rounded-sm overflow-hidden border border-line">
            <Image
              src={`/region-thumbnails/${product.region}.png`}
              alt={t("prod.map.alt", { name: tv("region", product.region ?? ""), country: regionCountry(regionInfo.country, lang) })}
              fill
              sizes="(min-width: 640px) 448px, 100vw"
              className="object-cover"
            />
          </div>
          <p className="text-sm text-ink-muted mt-2">
            {tv("region", product.region ?? "")}, {regionCountry(regionInfo.country, lang)}
          </p>
          <Link href="/map" className="text-sm text-matcha hover:text-forest transition-colors">
            {t("prod.map.full")} &rarr;
          </Link>
        </section>
      )}

      {product.tasting_notes && (
        <section className="mt-12">
          <SectionLabel>{t("prod.sec.tasting")}</SectionLabel>
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
          <SectionLabel>{t("prod.sec.composition")}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CompoundCard
              label="L-theanine"
              mgPerGram={product.l_theanine_mg_g}
              note={product.l_theanine_note}
            />
            <CompoundCard
              label="EGCG"
              mgPerGram={product.egcg_mg_g}
              note={product.egcg_note}
            />
          </div>
          <p className="text-xs text-ink-faint mt-3">
            {t("prod.comp.science")}{" "}
            <Link href="/research?topic=L-theanine%20and%20caffeine" className="text-matcha hover:text-forest">
              {t("prod.comp.theanine")}
            </Link>
            {" "}&middot;{" "}
            <Link href="/research?topic=Antioxidants%20and%20polyphenols" className="text-matcha hover:text-forest">
              {t("prod.comp.egcg")}
            </Link>
          </p>
        </section>
      )}

      {product.priceVariants.length > 0 && (
        <section className="mt-12">
          <SectionLabel>{t("prod.sec.pricing")}</SectionLabel>
          <div className="flex flex-col gap-2">
            {product.priceVariants.map((v) => {
              const { text, caution } = formatPriceVariant(v, { or: t("prod.var.or"), multi: t("prod.var.multi"), inferred: t("prod.var.inferred"), usd: t("prod.var.usd") });
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
          <SectionLabel>{t("prod.sec.details")}</SectionLabel>
          <details className="group border border-line rounded-sm bg-paper-raised">
            <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm text-ink-muted flex items-center justify-between">
              <span>
                {t(disclosedEntries.length === 1 ? "prod.details.summary.one" : "prod.details.summary.other", { n: disclosedEntries.length })}
              </span>
              <span className="text-ink-faint transition-transform group-open:rotate-180">&#9662;</span>
            </summary>
            {lang !== "en" && <p className="border-t border-line px-4 pt-3 text-xs text-ink-faint">{t("prod.details.note")}</p>}
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
          <SectionLabel>{t("prod.sec.notes")}</SectionLabel>
          <p className="text-sm text-ink-muted leading-relaxed">{product.page_notes}</p>
        </section>
      )}

      <ProductReviews productId={product.id} productName={product.product_name} />
      <Comments targetType="product" targetKey={String(product.id)} subject={product.product_name} />

      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <SectionLabel>
            {product.region && product.grade
              ? t("prod.more.both", { grade: tv("grade", product.grade), region: tv("region", product.region) })
              : product.region
                ? t("prod.more.region", { region: tv("region", product.region) })
                : t("prod.more.grade", { grade: tv("grade", product.grade ?? "") })}
          </SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {moreFromBrand.length > 0 && (
        <section className="mt-12">
          <SectionLabel>{t("prod.more.brand", { brand: product.brand_name })}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moreFromBrand.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
          <Link
            href={`/brands/${encodeURIComponent(product.brand_name)}`}
            className="inline-block mt-4 text-sm text-matcha hover:text-forest transition-colors"
          >
            {t("prod.viewAll", { brand: product.brand_name })} &rarr;
          </Link>
        </section>
      )}

      <ResearchLinks
        lang={lang}
        topics={["L-theanine and caffeine", "Processing, milling and quality", "Safety, contaminants and toxicity"]}
        blurb={t("prod.research.blurb")}
      />
    </main>
  );
}
