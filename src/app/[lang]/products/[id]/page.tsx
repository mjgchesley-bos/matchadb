import type { Metadata } from "next";
import { Fragment } from "react";
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
import { isHealthKey, isHealthText, sanitizeValue, stripHealth } from "@/lib/health-filter";
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

// tasting_notes was consolidated from ~70 differently-named source fields: each " | "-separated line is
// usually "Some Label: text" ("Tasting Notes Flavor: ...", "Aroma: ...", "Texture: ...", "Flavor Profile Tags:
// Earthy, Umami") and the label spelling varies. This turns the lines into two things the page can show at a
// glance: short descriptor words as chips, and longer sentences under a canonical label (Flavor, Aroma,
// Texture...). Junk lines ("... Disclosed: true", "conflicting descriptions found") are dropped.
const TASTE_ORDER = ["flavor", "aroma", "texture", "finish", "sweetness", "bitterness", "umami", "appearance", "notes"] as const;
type TasteKey = (typeof TASTE_ORDER)[number];
const TASTE_LABELS: [RegExp, TasteKey][] = [
  [/aroma|fragrance|scent|smell/, "aroma"],
  [/texture|mouthfeel|body|froth|foam/, "texture"],
  [/finish|aftertaste|length/, "finish"],
  [/sweet/, "sweetness"],
  [/bitter|astring/, "bitterness"],
  [/umami/, "umami"],
  [/colou?r|appearance|liquor/, "appearance"],
  [/flavou?r|taste|tasting|profile|description|character/, "flavor"],
];

function parseTasting(raw: string): { chips: string[]; rows: { key: TasteKey; items: string[] }[] } {
  const chips: string[] = [];
  const seen = new Set<string>();
  const rows = new Map<TasteKey, string[]>();
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const addChip = (c: string) => {
    const k = c.toLowerCase();
    if (!seen.has(k) && chips.length < 14) {
      seen.add(k);
      chips.push(cap(c));
    }
  };
  for (const line of raw.split(" | ")) {
    const m = line.match(/^([^:]{2,60}):\s*(.+)$/);
    const label = (m ? m[1] : "").trim().toLowerCase();
    const value = (m ? m[2] : line).trim();
    if (!value || /^(true|false|n\/a|none|unknown|not disclosed)$/i.test(value)) continue;
    if (/disclosed/.test(label) || /conflicting descriptions|see contradictions/i.test(value)) continue;
    const tagLabel = /tags|category|descriptors?/.test(label);
    let key: TasteKey = "notes";
    if (!label) key = "flavor";
    else for (const [re, k] of TASTE_LABELS) if (re.test(label)) { key = k; break; }
    // Short descriptive phrases become chips (flavor lines only); longer ones become bullets under the label.
    const bullets: string[] = [];
    for (const seg of value.split(/;\s*/).map((x) => x.trim()).filter(Boolean)) {
      if (isHealthText(seg)) continue;
      const quoted = /["\u201c\u201d]|'\w[^']*\w'/.test(seg);
      const parts = seg.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
      const shortList = !quoted && parts.length >= 2 && parts.length <= 10 && parts.every((x) => x.length <= 42 && !/[.!?]$/.test(x));
      if ((tagLabel || key === "flavor") && shortList) parts.forEach(addChip);
      else if ((tagLabel || key === "flavor") && !quoted && seg.length <= 42 && !/[.!?]$/.test(seg)) addChip(seg);
      else bullets.push(cap(seg));
    }
    if (bullets.length) rows.set(key, [...(rows.get(key) ?? []), ...bullets]);
  }
  return { chips, rows: TASTE_ORDER.filter((k) => rows.has(k)).map((k) => ({ key: k, items: rows.get(k) as string[] })) };
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

  const disclosedEntries = Object.entries(product.disclosed || {})
    .filter(([key]) => !REDUNDANT_DISCLOSED_KEYS.has(key) && !isHealthKey(key))
    .map(([key, value]) => [key, /name/i.test(key) ? value : sanitizeValue(value)] as [string, unknown])
    .filter(([, value]) => value != null && value !== "");
  const pageNotes = product.page_notes ? stripHealth(product.page_notes) : "";
  const externalLink = getExternalLinkInfo(product.source_url);
  const productUrl = pageAlternates(lang, `/products/${product.id}`).canonical;
  const logoPath = getBrandLogoPath(product.brand_name);
  const factsLine = buildFactsLine(product, t, tv, lang);
  // Only a figure the brand states on its own product page is shown. Grade- or cultivar-level research estimates are
  // not measurements of this product, so they are never displayed.
  const brandStated = (n?: string | null) => (n && n.startsWith("Disclosed on the brand") ? n : null);
  const theanineNote = brandStated(product.l_theanine_note);
  const egcgNote = brandStated(product.egcg_note);
  const hasCompounds = Boolean(theanineNote || egcgNote);
  const taste = product.tasting_notes ? parseTasting(product.tasting_notes) : null;
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

      {taste && (taste.chips.length > 0 || taste.rows.length > 0) && (
        <section className="mt-12">
          <SectionLabel>{t("prod.sec.tasting")}</SectionLabel>
          <div className="rounded-sm border border-line bg-paper-raised p-5 sm:p-6">
            {taste.chips.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {taste.chips.map((c) => (
                  <li key={c} className="rounded-full bg-matcha-soft px-3.5 py-1.5 text-sm font-medium text-forest">
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {taste.rows.length > 0 && (
              <dl className={`${taste.chips.length > 0 ? "mt-5 border-t border-line pt-5 " : ""}grid gap-x-6 gap-y-4 sm:grid-cols-[7.5rem_1fr]`}>
                {taste.rows.map((r) => (
                  <Fragment key={r.key}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-matcha sm:pt-1">{t(`prod.taste.${r.key}` as "prod.taste.flavor")}</dt>
                    <dd className="text-base leading-relaxed text-ink">
                      {r.items.length === 1 ? (
                        r.items[0]
                      ) : (
                        <ul className="flex flex-col gap-1.5">
                          {r.items.map((it) => (
                            <li key={it} className="flex gap-2.5">
                              <span aria-hidden="true" className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-matcha" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            )}
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
              note={theanineNote}
            />
            <CompoundCard
              label="EGCG"
              mgPerGram={product.egcg_mg_g}
              note={egcgNote}
            />
          </div>
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

      {pageNotes && (
        <section className="mt-8">
          <SectionLabel>{t("prod.sec.notes")}</SectionLabel>
          <p className="text-sm text-ink-muted leading-relaxed">{pageNotes}</p>
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

    </main>
  );
}
