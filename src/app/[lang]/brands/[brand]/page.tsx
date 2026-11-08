import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { getBrandProducts, getComparablePrices } from "@/lib/db";
import { getBrandSummary } from "@/lib/product-insight";
import { formatPrice } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { Comments } from "@/components/Comments";
import { FavoriteBrandButton } from "@/components/FavoriteBrandButton";
import { BrandLogo } from "@/components/product-cards";
import { JsonLd } from "@/components/JsonLd";
import { ResearchLinks } from "@/components/ResearchLinks";
import { ShippingNote } from "@/components/ShippingNote";
import { getBrandLogoPath } from "@/lib/logos";
import { comparisonsFor } from "@/lib/compare";
import { usd30 } from "@/lib/unit-price";
import { BRAND_RESELLER_NOTES, chainsForBrand, resellersForBrand, storesForBrand } from "@/lib/stores";
import { suppliersForBrand } from "@/lib/suppliers";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { INTL_LANG, isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; brand: string }>;
}): Promise<Metadata> {
  const { brand, lang: rawLang } = await params;
  const lang: Locale = isLocale(rawLang) ? rawLang : "en";
  const t = getT(lang);
  const brandName = decodeURIComponent(brand);
  const products = await getBrandProducts(brandName);
  if (products.length === 0) return {};

  const n = products.length;
  const plain = /matcha|抹茶|말차/i.test(brandName);
  const title = t(`br.title.${plain ? "plain." : ""}${n === 1 ? "one" : "other"}` as "br.title.one", { brand: brandName, n });
  const comparable = (await getComparablePrices())
    .filter((c) => c.brand === brandName)
    .map((c) => c.pricePerGram)
    .sort((a, b) => a - b);
  const priceBit =
    comparable.length >= 3
      ? t("br.desc.price", { lo: usd30(comparable[0]), hi: usd30(comparable[comparable.length - 1]) })
      : "";
  const description = t(n === 1 ? "br.desc.one" : "br.desc.other", { brand: brandName, n, price: priceBit });
  const alternates = pageAlternates(lang, `/brands/${encodeURIComponent(brandName)}`);

  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ lang: string; brand: string }>;
}) {
  const { brand } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const brandName = decodeURIComponent(brand);
  const products = await getBrandProducts(brandName);

  if (products.length === 0) notFound();

  const brandUrl = pageAlternates(lang, `/brands/${encodeURIComponent(brandName)}`).canonical;
  const brandComparable = (await getComparablePrices()).filter((c) => c.brand === brandName);
  const summary = getBrandSummary({ brand: brandName, products, comparable: brandComparable }, lang, t, tv);
  const logoPath = getBrandLogoPath(brandName);
  const comparisons = comparisonsFor(brandName);
  const stockists = storesForBrand(brandName);
  const resellerNote = BRAND_RESELLER_NOTES[brandName];
  const onlineResellers = resellersForBrand(brandName);
  const chainListing = chainsForBrand(brandName);
  const wholesale = suppliersForBrand(brandName);
  const ownShops = stockists.filter((s) => s.kind === "brand-shop");
  const retailers = stockists.filter((s) => s.kind !== "brand-shop");
  const MAX_CARDS = 12;
  const fmtChecked = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Brand",
              "@id": `${brandUrl}#brand`,
              name: brandName,
              url: brandUrl,
              ...(logoPath ? { logo: `${SITE_URL}${logoPath}` } : {}),
            },
            {
              "@type": "CollectionPage",
              "@id": brandUrl,
              name: `${brandName} matcha products`,
              url: brandUrl,
              description: summary[0],
              about: { "@id": `${brandUrl}#brand` },
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: products.length,
                itemListElement: products.map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_URL}/products/${p.id}`,
                  name: p.product_name,
                })),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: brandName, item: brandUrl },
              ],
            },
          ],
        }}
      />
      <nav aria-label={t("prod.crumb.aria")} className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">
          MatchaDB
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint truncate">{brandName}</span>
      </nav>
      <div className="flex items-center gap-4 mt-3 mb-1.5">
        <BrandLogo brandName={brandName} size={56} allowTallerThanSize />
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{brandName}</h1>
      </div>
      <p className="text-sm text-ink-muted mb-3">
        {t(products.length === 1 ? "br.count.one" : "br.count.other", { n: products.length })}
      </p>
      <p className="text-ink-muted leading-relaxed max-w-2xl">{summary.join(" ")}</p>
      <FavoriteBrandButton brand={brandName} />
      <ShippingNote brand={brandName} lang={lang} />
      {wholesale.length > 0 && (
        <p className="mt-3 text-sm text-ink-muted">
          {wholesale.map((s, i) => (
            <span key={s.slug}>
              {i > 0 && " · "}
              <Link href={`/wholesale#${s.slug}`} className="text-matcha underline hover:text-forest">
                {s.name === brandName ? t("br.ws.own") : t("br.ws.via", { name: s.name })}
              </Link>
            </span>
          ))}
        </p>
      )}
      <div className="mb-8" />

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
                      {tv("grade", p.grade)}
                    </span>
                  )}
                  {(JSON.parse(p.flavor_tags) as string[]).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5"
                    >
                      {tv("flavor", tag)}
                    </span>
                  ))}
                  {p.not_found === 1 && (
                    <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5">
                      {t("br.unverifiable")}
                    </span>
                  )}
                </div>
                {(() => {
                  const price = formatPrice(p, t("price.converted"));
                  if (price.kind === "unresolved") {
                    return (
                      <span className="text-sm mt-1.5 text-ink-faint italic">
                        {p.source_url ? t("prod.price.seeSite") : t("prod.price.notConfirmed")}
                      </span>
                    );
                  }
                  if (price.kind === "linkOnly") {
                    return (
                      <span className="text-sm mt-1.5 text-ink-faint italic">
                        {t("br.price.onPage")}
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
                  {link.amazon ? t("prod.link.amazon") : t("prod.link.view")} &rarr;
                </a>
              )}
            </div>
          );
        })}
      </div>

      {(stockists.length > 0 || onlineResellers.length > 0 || chainListing) && (
        <section className="mt-12" aria-labelledby="where-to-buy">
          <h2 id="where-to-buy" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">
            {t("br.rs.heading", { brand: brandName })}
          </h2>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
            {t("br.rs.intro", { brand: brandName })}
          </p>
          {resellerNote && (
            <p className="mt-2 text-sm text-ink-muted max-w-2xl leading-relaxed">
              {resellerNote.text}{" "}
              <a href={resellerNote.url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest underline">
                {resellerNote.label}
              </a>
              .
            </p>
          )}
          {[
            { title: t("br.rs.own", { brand: brandName }), list: ownShops },
            { title: t("br.rs.retail"), list: retailers },
          ]
            .filter((g) => g.list.length > 0)
            .map((g) => (
              <div key={g.title} className="mt-5">
                <h3 className="font-display text-lg font-semibold text-ink">{g.title}</h3>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.list.slice(0, MAX_CARDS).map((s) => {
                    const claim = s.brands.find((b) => b.name === brandName);
                    return (
                      <li key={s.id} className="rounded-sm border border-line bg-paper-raised p-4">
                        <p className="font-medium text-ink">{s.name}</p>
                        <p className="text-sm text-ink-muted">
                          {s.address}, {s.city}, {s.state} {s.zip}
                        </p>
                        <p className="mt-1.5 text-xs">
                          <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">{t(`c.st.kind.${s.kind}` as "c.st.kind.cafe")}</span>
                        </p>
                        {s.note && <p className="mt-2 text-xs text-ink-faint leading-relaxed">{s.note}</p>}
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {s.url && (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                              {t("br.rs.web")}
                            </a>
                          )}
                          <a href={claim?.evidence ?? s.url} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-ink-muted">
                            {s.listedBy ? t("br.rs.src.locator", { date: fmtChecked(s.checked) }) : t("br.rs.src.plain", { date: fmtChecked(s.checked) })}
                          </a>
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {g.list.length > MAX_CARDS && (
                  <p className="mt-3 text-sm text-ink-muted">
                    {t("br.rs.more", { n: g.list.length - MAX_CARDS })}{" "}
                    <Link href={`/stores?brand=${encodeURIComponent(brandName)}`} className="text-matcha hover:text-forest underline">
                      {t("br.rs.seeAll")}
                    </Link>
                    .
                  </p>
                )}
              </div>
            ))}
          {onlineResellers.length > 0 && (
            <div className="mt-5">
              <h3 className="font-display text-lg font-semibold text-ink">{t("br.rs.online")}</h3>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {onlineResellers.map((r) => (
                  <li key={r.url} className="rounded-sm border border-line bg-paper-raised p-4">
                    <p className="font-medium text-ink">
                      {r.name}
                      {r.amazonOnly && <span className="text-ink-muted"> {t("br.rs.amazonOnly")}</span>}
                    </p>
                    <p className="mt-1.5 text-xs">
                      <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">{r.channel === "amazon" ? t("br.rs.chAmazon") : t("br.rs.chOnline")}</span>
                    </p>
                    <p className="mt-2 text-xs text-ink-faint leading-relaxed">{r.basis}.</p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                        {r.channel === "amazon" ? t("br.rs.viewAmazon") : t("br.rs.visit")}
                      </a>
                      <a href={r.evidence} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-ink-muted">
                        {t("br.rs.src.plain", { date: fmtChecked(r.checked) })}
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {chainListing && (
            <div className="mt-5">
              <h3 className="font-display text-lg font-semibold text-ink">{t("br.rs.chains")}</h3>
              <p className="mt-1 text-sm text-ink-muted max-w-2xl leading-relaxed">
                {t("br.rs.chainsIntro", { brand: brandName })}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {chainListing.chains.map((c) => (
                  <li key={c.name} className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-muted">
                    {c.name}
                    {c.select && <span className="text-ink-faint"> {t("br.rs.select")}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                <a href={chainListing.evidence} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-ink-muted">
                  {t("br.rs.checkedLbl", { label: chainListing.evidenceLabel, date: fmtChecked(chainListing.checked) })}
                </a>
              </p>
            </div>
          )}
          {stockists.length > 0 && (
            <Link href={`/stores?brand=${encodeURIComponent(brandName)}`} className="inline-block mt-5 text-matcha hover:text-forest">
              {t("br.rs.storeMap")} &rarr;
            </Link>
          )}
        </section>
      )}

      {comparisons.length > 0 && (
        <section className="mt-12" aria-label={t("br.cmp.aria", { brand: brandName })}>
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("br.cmp.heading", { brand: brandName })}</h2>
          <div className="flex flex-wrap gap-2.5">
            {comparisons.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="rounded-full border-2 border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
              >
                {t("br.cmp.vs", { brand: brandName, other: c.other })}
              </Link>
            ))}
          </div>
        </section>
      )}

      <ResearchLinks
        lang={lang}
        topics={["Antioxidants and polyphenols", "L-theanine and caffeine", "Authenticity and analytical methods"]}
        blurb={t("br.research.blurb")}
      />
      <Comments targetType="brand" targetKey={brandName} subject={brandName} />
    </main>
  );
}
