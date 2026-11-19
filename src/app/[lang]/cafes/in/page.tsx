import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getPlaceIndex } from "@/lib/cafe-places";
import { countryName } from "@/lib/cafe-types";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const { countries } = getPlaceIndex();
  const total = [...countries.values()].reduce((a, b) => a + b, 0);
  const alternates = pageAlternates(lang, "/cafes/in");
  const title = t("pl.countries.h1");
  const description = t("pl.countries.desc", { n: total.toLocaleString("en-US"), c: countries.size });
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CafePlaces({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const { countries } = getPlaceIndex();
  const list = [...countries.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">
        <Link href="/matcha-map" className="hover:text-matcha">{t("nav.cafes.long")}</Link>
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{t("pl.countries.h1")}</h1>
      <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        {list.map(([cc, n]) => (
          <li key={cc} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
            <Link href={`/cafes/in/${cc.toLowerCase()}`} className="text-ink hover:text-matcha">{countryName(cc, lang)}</Link>
            <span className="text-sm tabular-nums text-ink-faint">{t("pl.count", { n: n.toLocaleString("en-US") })}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
