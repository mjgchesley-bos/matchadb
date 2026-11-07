import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/i18n/Link";
import { getStores } from "@/lib/stores";
import { getBrandMatchaSummaries } from "@/lib/db";
import { StoreFinder } from "@/components/StoreFinder";
import { REGIONS, regionByKey, regionForCountry } from "@/lib/cafe-regions";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { getT } from "@/i18n/server";
import { fmtNum, isLocale, localePath, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const title = t("stores.meta.title");
  const description = t("stores.meta.description");
  const alternates = pageAlternates(lang, "/stores");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function StoresPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang: rawLang } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const t = getT(lang);
  const description = t("stores.meta.description");
  const sp = await searchParams;
  const stores = getStores();
  const wanted = Array.isArray(sp.brand) ? sp.brand[0] : sp.brand;
  const initialBrand = wanted && stores.some((s) => s.brands.some((b) => b.name === wanted)) ? wanted : "";
  const countries = new Set(stores.map((s) => s.cc ?? "US")).size;
  // Start in the region asked for; for a brand link, in a region that actually stocks it (the US first).
  const asked = Array.isArray(sp.region) ? sp.region[0] : sp.region;
  const stocked = REGIONS.map((r) => r.key).filter((k) => stores.some((s) => regionForCountry(s.cc ?? "US") === k && (!initialBrand || s.brands.some((b) => b.name === initialBrand))));
  const initialRegion = asked ? regionByKey(asked).key : (stocked[0] ?? "us");
  const brandNames = [...new Set(stores.flatMap((s) => s.brands.map((b) => b.name)))];
  const brands = brandNames.length;
  const brandInfo = await getBrandMatchaSummaries(brandNames);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("stores.jsonld.name"),
          url: `${SITE_URL}${localePath(lang, "/stores")}`,
          description,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: stores.filter((s) => !s.listedBy).length,
            itemListElement: stores.filter((s) => !s.listedBy).map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Store",
                name: s.name,
                url: s.url,
                address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.city, addressRegion: s.state || undefined, postalCode: s.zip, addressCountry: s.cc ?? "US" },
                geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng },
              },
            })),
          },
        }}
      />

      <header className="max-w-3xl mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("stores.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("stores.h1")}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t("stores.lede")}
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          {t(countries === 1 ? "stores.count.one" : "stores.count.other", { count: fmtNum(lang, stores.length), countries, brands })}
        </p>
      </header>

      <StoreFinder stores={stores} brandInfo={brandInfo} contactEmail={CONTACT_EMAIL} initialBrand={initialBrand} initialRegion={initialRegion} />

      <section className="mt-14 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="how-stores">
        <h2 id="how-stores" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("stores.how.h2")}</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {t("stores.how.p1")}
        </p>
        <p className="mt-3 text-sm text-ink-muted leading-relaxed">
          {rich(t("stores.how.p2", { tell: "{tell}", search: "{search}" }), {
            tell: (
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MatchaDB store suggestion")}`} className="text-matcha hover:text-forest underline">
                {t("stores.how.tell")}
              </a>
            ),
            search: (
              <Link href="/browse" className="text-matcha hover:text-forest underline">
                {t("stores.how.search")}
              </Link>
            ),
          })}
        </p>
      </section>
    </main>
  );
}
