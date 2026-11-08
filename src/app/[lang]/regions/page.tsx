import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getRegionSummary } from "@/lib/db";
import { getRegionInfo, regionCountry } from "@/lib/regions";
import { usd30 } from "@/lib/unit-price";
import { MIN_PRODUCTS_FOR_PAGE, REGION_CONTENT } from "@/lib/region-content";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("rg.idx.title"), description: t("rg.idx.desc"), alternates: pageAlternates(lang, "/regions") };
}

export default async function RegionsIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const summaries = (
    await Promise.all(Object.keys(REGION_CONTENT).map((key) => getRegionSummary(key)))
  )
    .filter((s): s is NonNullable<typeof s> => s !== null && s.productCount >= MIN_PRODUCTS_FOR_PAGE)
    .sort((a, b) => b.productCount - a.productCount);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("footer.regions")}</p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
        {t("rg.idx.h1")}
      </h1>
      <p className="text-ink-muted mt-3 max-w-2xl leading-relaxed">
        {t("rg.idx.lead")}
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaries.map((s) => {
          const info = getRegionInfo(s.region);
          const content = REGION_CONTENT[s.region];
          if (!info) return null;
          return (
            <Link
              key={s.region}
              href={`/regions/${content.slug}`}
              className="border border-line rounded-sm p-5 bg-paper-raised hover:border-matcha hover:bg-matcha-soft transition-colors flex flex-col gap-2"
            >
              <span className="font-display text-xl font-semibold text-ink">{tv("region", s.region)}</span>
              <span className="text-xs text-ink-faint">{regionCountry(info.country, lang)}</span>
              <span className="text-sm text-ink-muted mt-1">
                {t("rg.idx.stats", { products: s.productCount, brands: s.brandCount })}
                {s.pricedCount >= MIN_PRODUCTS_FOR_PAGE && s.medianPricePerGram != null
                  ? t("rg.idx.typ", { price: usd30(s.medianPricePerGram) })
                  : ""}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-ink-faint mt-8">
        {t("rg.idx.foot", { n: MIN_PRODUCTS_FOR_PAGE })}
      </p>
    </main>
  );
}
