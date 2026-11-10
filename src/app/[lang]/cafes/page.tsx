import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/i18n/Link";
import { CafeFinder } from "@/components/CafeFinder";
import { REGIONS, regionByKey } from "@/lib/cafe-regions";
import { getAllCafes } from "@/lib/cafes";
import { CONTACT_EMAIL } from "@/lib/site";
import { getT } from "@/i18n/server";
import { INTL_LANG, fmtNum, isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const title = t("cafes.meta.title");
  const description = t("cafes.meta.description");
  const alternates = pageAlternates(lang, "/cafes");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CafesPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang: rawLang } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const t = getT(lang);
  const sp = await searchParams;
  const wanted = Array.isArray(sp.region) ? sp.region[0] : sp.region;
  const initial = regionByKey(wanted).key;
  const cafes = getAllCafes();
  const countries = new Set(cafes.map((c) => c.cc ?? "US")).size;
  const focused = cafes.filter((c) => c.focus).length;
  const regionNames = REGIONS.map((r) => t(`c.region.${r.key}` as "c.region.us"));
  // English keeps its plain "A, B and C" wording; other languages use their own list style.
  const covered = lang === "en" ? `${regionNames.slice(0, -1).join(", ")} and ${regionNames[regionNames.length - 1]}` : new Intl.ListFormat(INTL_LANG[lang], { type: "conjunction" }).format(regionNames);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <header className="max-w-3xl mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("cafes.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("cafes.h1")}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t("cafes.lede")}
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          {t("cafes.count", { count: fmtNum(lang, cafes.length), countries, focused: fmtNum(lang, focused), regions: covered })}
        </p>
      </header>

      <CafeFinder contactEmail={CONTACT_EMAIL} initialRegion={initial} />

      <section className="mt-14 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-cafes">
        <h2 id="how-cafes" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">
          {t("cafes.how.h2")}
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("cafes.how.p1")}
        </p>
        <p className="mt-3 text-sm text-ink-muted leading-relaxed">
          {rich(t("cafes.how.p2", { tell: "{tell}", search: "{search}" }), {
            tell: (
              <a href="#suggest-cafe" className="text-matcha hover:text-forest underline">
                {t("cafes.how.tell")}
              </a>
            ),
            search: (
              <Link href="/browse" className="text-matcha hover:text-forest underline">
                {t("cafes.how.search")}
              </Link>
            ),
          })}
        </p>
        <p className="mt-3 text-xs text-ink-faint">{t("cafes.how.attrib")}</p>
      </section>
    </main>
  );
}
