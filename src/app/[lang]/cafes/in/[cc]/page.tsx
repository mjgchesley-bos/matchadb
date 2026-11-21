import type { Metadata } from "next";
import { PageHero, Panel } from "@/components/PageUI";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { cityPath, getPlaceIndex, otherPages, otherCafes } from "@/lib/cafe-places";
import { countryName } from "@/lib/cafe-types";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

// Built the first time someone asks for it, then kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { lang: string; cc: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, cc } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const up = cc.toUpperCase();
  const n = getPlaceIndex().countries.get(up);
  if (!n) return { title: t("cafe.notFound"), robots: { index: false } };
  const place = countryName(up, lang);
  const alternates = pageAlternates(lang, `/cafes/in/${cc.toLowerCase()}`);
  const title = t("pl.country.h1", { place });
  const description = t("pl.country.desc", { n: n.toLocaleString("en-US"), place });
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CafeCountry({ params }: { params: Promise<Params> }) {
  const { lang: raw, cc } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const t = getT(lang);
  const up = cc.toUpperCase();
  const idx = getPlaceIndex();
  const total = idx.countries.get(up);
  if (!total) notFound();
  const place = countryName(up, lang);
  const cities = idx.byCountry.get(up) ?? [];
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <PageHero eyebrow={t("pl.back")} title={t("pl.country.h1", { place })} lede={t("pl.country.desc", { n: total.toLocaleString("en-US"), place })} />
      {cities.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((e) => (
            <li key={e.slug} className="flex items-baseline justify-between gap-3 rounded-md border-2 border-line bg-paper-raised px-4 py-3 shadow-sm hover:border-matcha hover:bg-matcha-soft">
              <Link href={cityPath(e)} className="text-ink hover:text-matcha">{e.city}{e.state ? `, ${e.state}` : ""}</Link>
              <span className="text-sm tabular-nums text-ink-faint">{e.cafes.length}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {otherPages(up) > 0 && (
        <section className="mt-8 rounded-md border-2 border-line bg-paper-raised p-5 shadow-sm sm:p-6" aria-labelledby="other-towns">
          <h2 id="other-towns" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Smaller towns</h2>
          <p className="mt-1 text-sm text-ink-muted">{otherCafes(up).length.toLocaleString("en-US")} more cafés in places with fewer than three, listed alphabetically.</p>
          <p className="mt-3 flex flex-wrap gap-2 text-sm">
            {Array.from({ length: otherPages(up) }, (_, i) => (
              <Link key={i} href={`/cafes/in/${cc.toLowerCase()}/other-${i + 1}`} className="rounded-full border-2 border-line-strong px-3 py-1 text-ink hover:bg-matcha-soft">
                Page {i + 1}
              </Link>
            ))}
          </p>
        </section>
      )}
      {cities.length === 0 && otherPages(up) === 0 && (
        <p className="mt-6 rounded-md border-2 border-line bg-paper-raised p-5 text-ink-muted">
          <Link href="/matcha-map" className="text-matcha underline hover:text-forest">{t("nav.cafes.long")}</Link>
        </p>
      )}
    </main>
  );
}
