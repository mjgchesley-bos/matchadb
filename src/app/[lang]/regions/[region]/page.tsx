import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { getProducts, getRegionSummary } from "@/lib/db";
import { getRegionInfo, regionCountry } from "@/lib/regions";
import { usd30 } from "@/lib/unit-price";
import {
  MIN_PRODUCTS_FOR_PAGE,
  REGION_CONTENT,
  regionFromSlug,
} from "@/lib/region-content";
import { gradeLabel } from "@/components/product-cards";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { ResearchLinks } from "@/components/ResearchLinks";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

export function generateStaticParams() {
  return Object.values(REGION_CONTENT).map((c) => ({ region: c.slug }));
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
      <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; region: string }>;
}): Promise<Metadata> {
  const { region: slug, lang: rawLang } = await params;
  const lang: Locale = isLocale(rawLang) ? rawLang : "en";
  const t = getT(lang);
  const tv = getTV(lang);
  const key = regionFromSlug(slug);
  const info = key ? getRegionInfo(key) : null;
  if (!key || !info) return {};
  const summary = await getRegionSummary(key);
  if (!summary) return {};
  const name = tv("region", key);
  const title = t("rg.title", { name });
  const description = t("rg.desc", { n: summary.productCount, name, country: regionCountry(info.country, lang), b: summary.brandCount });
  const alternates = pageAlternates(lang, `/regions/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ lang: string; region: string }>;
}) {
  const { region: slug } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const c = getC(lang);
  const key = regionFromSlug(slug);
  if (!key) notFound();
  const info = getRegionInfo(key);
  const content = REGION_CONTENT[key];
  const summary = await getRegionSummary(key);
  if (!info || !summary || summary.productCount < MIN_PRODUCTS_FOR_PAGE) notFound();

  const { products } = await getProducts({ region: key, page: 1, pageSize: 12 });
  const canShowPrice = summary.pricedCount >= MIN_PRODUCTS_FOR_PAGE;
  const pageUrl = pageAlternates(lang, `/regions/${slug}`).canonical;
  const name = tv("region", key);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Regions", item: `${SITE_URL}/regions` },
            { "@type": "ListItem", position: 3, name, item: pageUrl },
          ],
        }}
      />
      <nav aria-label={t("prod.crumb.aria")} className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">MatchaDB</Link>
        <span aria-hidden="true">/</span>
        <Link href="/regions" className="hover:text-matcha transition-colors">{t("footer.regions")}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint">{name}</span>
      </nav>

      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mt-6 mb-2">
        {regionCountry(info.country, lang)}
      </p>
      <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight">
        {t("rg.h1", { name })}
      </h1>
      <p className="text-ink-muted text-lg leading-relaxed mt-4 max-w-2xl">{c(`rc.${content.slug}.intro`, content.intro)}</p>
      {content.note && <p className="text-sm text-ink-faint mt-3 max-w-2xl">{c(`rc.${content.slug}.note`, content.note)}</p>}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={t("rg.stat.products")} value={String(summary.productCount)} />
        <Stat label={t("rg.stat.brands")} value={String(summary.brandCount)} />
        <Stat
          label={t("rg.stat.price")}
          value={canShowPrice ? usd30(summary.medianPricePerGram) : "—"}
          sub={
            canShowPrice
              ? t("rg.stat.mid", { lo: usd30(summary.p25PricePerGram), hi: usd30(summary.p75PricePerGram) })
              : t("rg.stat.few")
          }
        />
        <Stat label={t("rg.stat.organic")} value={`${Math.round(summary.organicShare * 100)}%`} sub={t("rg.stat.ofProducts")} />
      </div>
      <p className="text-xs text-ink-faint mt-2 max-w-2xl">
        {t("rg.price.note", { n: summary.pricedCount })}
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-8 items-start">
        <div className="flex flex-col gap-8">
          {summary.grades.length > 0 && (
            <section>
              <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rg.grades")}</h2>
              <div className="flex flex-wrap gap-2">
                {summary.grades.map((g) => (
                  <span key={g.grade} className="rounded-full bg-matcha-soft text-matcha-ink px-3 py-1 text-sm">
                    {gradeLabel(g.grade, tv)} <span className="text-ink-faint">· {g.count}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-faint mt-2">{t("rg.grades.note")}</p>
            </section>
          )}

          {summary.topFlavors.length > 0 && (
            <section>
              <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rg.flavor")}</h2>
              <ul className="flex flex-col gap-2">
                {summary.topFlavors.map((f) => (
                  <li key={f.tag} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-ink">{tv("flavor", f.tag)}</span>
                    <span className="flex-1 h-2 bg-paper-raised border border-line rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-matcha"
                        style={{ width: `${Math.round(f.share * 100)}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-ink-muted tabular-nums">
                      {Math.round(f.share * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-faint mt-2">
                {t("rg.flavor.note")}
              </p>
            </section>
          )}

          <section>
            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rg.brands")}</h2>
            <ul className="flex flex-wrap gap-2">
              {summary.topBrands.map((b) => (
                <li key={b.name}>
                  <Link
                    href={`/brands/${encodeURIComponent(b.name)}`}
                    className="inline-block rounded-full border border-line-strong text-ink-muted hover:text-ink hover:border-matcha px-3 py-1 text-sm transition-colors"
                  >
                    {b.name} <span className="text-ink-faint">· {b.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="relative w-full sm:w-72 aspect-[8/5] rounded-sm overflow-hidden border border-line">
          <Image
            src={`/region-thumbnails/${key}.png`}
            alt={t("prod.map.alt", { name, country: regionCountry(info.country, lang) })}
            fill
            sizes="(min-width: 640px) 288px, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">
          {t("rg.matchaFrom", { name })}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} lang={lang} />
          ))}
        </div>
        {summary.productCount > products.length && (
          <Link
            href={`/browse?region=${encodeURIComponent(key)}`}
            className="inline-block mt-5 text-sm text-matcha hover:text-forest transition-colors"
          >
            {t("rg.seeAll", { n: summary.productCount, name })} &rarr;
          </Link>
        )}
      </section>

      <ResearchLinks
        lang={lang}
        heading={t("rg.research.heading")}
        topics={["Cultivation and shading", "Processing, milling and quality", "Aroma, flavor and sensory"]}
        blurb={t("rg.research.blurb")}
      />

      <p className="text-xs text-ink-faint mt-12">
        {rich(t("rg.foot", { link: "{link}" }), { link: <Link href="/about" className="underline">{t("prod.ctx.how")}</Link> })}
      </p>
    </main>
  );
}
