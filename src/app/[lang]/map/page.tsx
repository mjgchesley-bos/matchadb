import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/i18n/Link";
import { getMapLocations } from "@/lib/map-data";
import { localizeLocations } from "@/lib/map-i18n";
import { getRegionCounts, getStats } from "@/lib/db";
import { SourcingExplorer } from "@/components/SourcingExplorer";
import { getT } from "@/i18n/server";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("map.meta.title"), description: t("map.meta.description"), alternates: pageAlternates(lang, "/map") };
}

export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const t = getT(lang);
  const [locations, regionCounts, stats] = await Promise.all([getMapLocations(), getRegionCounts(), getStats()]);
  const totalWithRegion = regionCounts.reduce((sum, r) => sum + r.count, 0);
  const link = "text-matcha hover:text-forest transition-colors";

  return (
    <main className="flex-1 w-full">
      <SourcingExplorer locations={localizeLocations(locations, lang)} totalProducts={stats.productCount} />

      <section className="max-w-3xl mx-auto w-full px-6 py-12 text-sm text-ink-muted leading-relaxed flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("map.h2")}</h2>
        <p>{t("map.p1", { withRegion: fmtNum(lang, totalWithRegion), total: fmtNum(lang, stats.productCount) })}</p>
        <p>{t("map.p2")}</p>
        <p>{t("map.p3")}</p>
        <p>{t("map.p4")}</p>
        <p>
          {rich(t("map.p5", { browse: "{browse}", regions: "{regions}" }), {
            browse: (
              <Link href="/browse" className={link}>
                {t("map.browse")}
              </Link>
            ),
            regions: (
              <Link href="/regions" className={link}>
                {t("map.regions")}
              </Link>
            ),
          })}
        </p>
      </section>
    </main>
  );
}
