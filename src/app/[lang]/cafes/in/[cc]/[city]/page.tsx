import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { MIN_CAFES_FOR_CITY_PAGE, getPlaceIndex } from "@/lib/cafe-places";
import { cafeSlug, countryName, formatPlace } from "@/lib/cafe-types";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

// Built the first time someone asks for it, then kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { lang: string; cc: string; city: string };

function find(cc: string, city: string) {
  const slug = decodeURIComponent(city);
  const e = getPlaceIndex().cities.get(`${cc.toUpperCase()}/${slug}`);
  return e && e.cafes.length >= MIN_CAFES_FOR_CITY_PAGE ? e : null;
}
const placeOf = (e: { city: string; state: string; cc: string }, lang: Locale) => `${e.city}, ${e.cc === "US" ? e.state : countryName(e.cc, lang)}`.replace(/, $/, "");

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, cc, city } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const e = find(cc, city);
  if (!e) return { title: t("cafe.notFound"), robots: { index: false } };
  const place = placeOf(e, lang);
  const alternates = pageAlternates(lang, `/cafes/in/${cc.toLowerCase()}/${encodeURIComponent(e.slug)}`);
  const title = t("pl.city.h1", { place });
  const description = t("pl.city.desc", { n: e.cafes.length, place });
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CafeCity({ params }: { params: Promise<Params> }) {
  const { lang: raw, cc, city } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const t = getT(lang);
  const e = find(cc, city);
  if (!e) notFound();
  const place = placeOf(e, lang);
  const cafes = [...e.cafes].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">
        <Link href={`/cafes/in/${cc.toLowerCase()}`} className="hover:text-matcha">{t("pl.backCountry", { place: countryName(e.cc, lang) })}</Link>
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{t("pl.city.h1", { place })}</h1>
      <p className="mt-3 text-ink-muted">{t("pl.city.desc", { n: cafes.length, place })}</p>
      <ul className="mt-8 divide-y divide-line">
        {cafes.map((c) => (
          <li key={c.id} className="py-3">
            <Link href={`/cafes/${cafeSlug(c)}`} className="font-medium text-ink hover:text-matcha">{c.name}</Link>
            <span className="block text-sm text-ink-faint">{formatPlace(c, lang)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
