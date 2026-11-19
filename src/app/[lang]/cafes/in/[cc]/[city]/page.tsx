import type { Metadata } from "next";
import { PageHero } from "@/components/PageUI";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { MIN_CAFES_FOR_CITY_PAGE, cityPath, getPlaceIndex } from "@/lib/cafe-places";
import { matchaItem } from "@/lib/cafe-snippet";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { cafeSlug, countryName, formatPlace } from "@/lib/cafe-types";
import type { Cafe } from "@/lib/cafe-types";
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

// Matcha-focused cafés first (matcha in the name or all over the menu), then those with a priced matcha item, then the rest.
function pickCafes(list: Cafe[]): Cafe[] {
  const score = (c: Cafe) => (c.focus ? 2 : 0) + (c.via === "name" ? 1 : 0) + (matchaItem(c) ? 1 : 0);
  return [...list].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, cc, city } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const e = find(cc, city);
  if (!e) return { title: t("cafe.notFound"), robots: { index: false } };
  const place = placeOf(e, lang);
  const alternates = pageAlternates(lang, `/cafes/in/${cc.toLowerCase()}/${encodeURIComponent(e.slug)}`);
  let title = t("pl.city.h1", { place });
  let description = t("pl.city.desc", { n: e.cafes.length, place });
  if (lang === "en") {
    // The page people search for is "matcha in {city}" or "matcha near me": name the city, the count and a few real cafés.
    const names = pickCafes(e.cafes).slice(0, 3).map((c) => c.name);
    title = `Matcha in ${place}: ${e.cafes.length} Cafés That Serve It`;
    description = `${e.cafes.length} cafés in ${place} serve matcha${names.length ? `, including ${names.join(", ")}` : ""}. Menus, matcha prices where listed, and directions.`;
  }
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
  const en = lang === "en";
  const itemOf = new Map(cafes.map((c) => [c.id, matchaItem(c)]));
  const picks = pickCafes(e.cafes).filter((c) => c.focus || c.via === "name" || itemOf.get(c.id)).slice(0, 8);
  const prices = [...itemOf.values()].flatMap((x) => (x ? [Number(x.price.slice(1))] : []));
  const nearby = [...(getPlaceIndex().byCountry.get(e.cc) ?? [])]
    .filter((x) => x.slug !== e.slug && (e.cc !== "US" || x.state === e.state))
    .map((x) => ({ x, d: Math.hypot(x.cafes[0].lat - e.cafes[0].lat, x.cafes[0].lng - e.cafes[0].lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map((v) => v.x);
  const url = `${SITE_URL}${cityPath(e)}`;
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "ItemList",
              name: `Matcha cafés in ${place}`,
              numberOfItems: cafes.length,
              itemListElement: cafes.slice(0, 50).map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/cafes/${cafeSlug(c)}`, name: c.name })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Matcha cafés", item: `${SITE_URL}/cafes` },
                { "@type": "ListItem", position: 2, name: countryName(e.cc, "en"), item: `${SITE_URL}/cafes/in/${cc.toLowerCase()}` },
                { "@type": "ListItem", position: 3, name: e.city, item: url },
              ],
            },
          ],
        }}
      />
      <PageHero
        eyebrow={t("pl.backCountry", { place: countryName(e.cc, lang) })}
        title={t("pl.city.h1", { place })}
        lede={<>{en
          ? `${cafes.length} cafés in ${place} list matcha on their own menu or website${prices.length >= 3 ? `; where a price is shown, matcha drinks run about $${Math.min(...prices)}–$${Math.max(...prices)}` : ""}. Each entry links to the café's page with its menu evidence, directions, and member ratings and reviews.`
          : t("pl.city.desc", { n: cafes.length, place })}</>}
      />
      {en && picks.length > 0 && (
        <section className="mt-6 rounded-md border-2 border-line bg-paper-raised p-5 shadow-sm sm:p-6" aria-labelledby="picks">
          <h2 id="picks" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Best places for matcha in {e.city}</h2>
          <p className="mt-1 text-sm text-ink-muted">Cafés where matcha is front and centre, or where we found a priced matcha item on their own menu.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {picks.map((c) => {
              const it = itemOf.get(c.id);
              return (
                <li key={c.id} className="rounded-sm border-2 border-line bg-paper p-4 hover:border-matcha hover:bg-matcha-soft">
                  <Link href={`/cafes/${cafeSlug(c)}`} className="font-medium text-ink hover:text-matcha">{c.name}</Link>
                  <span className="block text-sm text-ink-faint">{formatPlace(c, lang)}</span>
                  {it && <span className="mt-1 block text-sm text-ink-muted">{it.name}, {it.price}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className="mt-6 rounded-md border-2 border-line bg-paper-raised p-5 shadow-sm sm:p-6" aria-labelledby="all-cafes">
      <h2 id="all-cafes" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{en ? `All ${cafes.length} matcha cafés in ${e.city}` : t("pl.city.h1", { place })}</h2>
      <ul className="mt-3 divide-y-2 divide-line">
        {cafes.map((c) => {
          const it = itemOf.get(c.id);
          return (
            <li key={c.id} className="py-3">
              <Link href={`/cafes/${cafeSlug(c)}`} className="font-medium text-ink hover:text-matcha">{c.name}</Link>
              {en && it && <span className="ml-2 text-sm text-ink-muted">{it.name}, {it.price}</span>}
              <span className="block text-sm text-ink-faint">{formatPlace(c, lang)}</span>
            </li>
          );
        })}
      </ul>
      </section>
      {en && nearby.length > 0 && (
        <section className="mt-6 rounded-md border-2 border-line bg-paper-raised p-5 shadow-sm sm:p-6" aria-labelledby="nearby">
          <h2 id="nearby" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Matcha in nearby cities</h2>
          <p className="mt-3 flex flex-wrap gap-2 text-sm">
            {nearby.map((x) => (
              <Link key={x.slug} href={cityPath(x)} className="rounded-full border-2 border-line-strong px-3 py-1 text-ink hover:bg-matcha-soft">
                {x.city} ({x.cafes.length})
              </Link>
            ))}
          </p>
        </section>
      )}
    </main>
  );
}
