import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { cityPath, getPlaceIndex } from "@/lib/cafe-places";
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
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">
        <Link href="/cafes/in" className="hover:text-matcha">{t("pl.back")}</Link>
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{t("pl.country.h1", { place })}</h1>
      <p className="mt-3 text-ink-muted">{t("pl.country.desc", { n: total.toLocaleString("en-US"), place })}</p>
      {cities.length > 0 ? (
        <ul className="mt-8 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((e) => (
            <li key={e.slug} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
              <Link href={cityPath(e)} className="text-ink hover:text-matcha">{e.city}{e.state ? `, ${e.state}` : ""}</Link>
              <span className="text-sm tabular-nums text-ink-faint">{e.cafes.length}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-ink-muted">
          <Link href="/cafes" className="text-matcha underline hover:text-forest">{t("nav.cafes.long")}</Link>
        </p>
      )}
    </main>
  );
}
