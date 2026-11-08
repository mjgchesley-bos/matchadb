import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { WholesaleDirectory } from "@/components/WholesaleDirectory";
import { getBrandFacets } from "@/lib/db";
import { REGION_CONTENT } from "@/lib/region-content";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { SUPPLIERS, type ProductType, type SupplierView } from "@/lib/suppliers";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const alternates = pageAlternates(lang, "/wholesale");
  const title = t("ws.title");
  const description = t("ws.desc");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

// Regions the site already has pages for; a few small neighbors fold into them, anything else is "Other".
const KNOWN_REGIONS = Object.keys(REGION_CONTENT);
const FOLD: Record<string, string> = { Kakegawa: "Shizuoka", Aichi: "Nishio", Zhejiang: "China" };
const regionOf = (r: string): string => {
  const k = FOLD[r] ?? r;
  return KNOWN_REGIONS.includes(k) ? k : "Other";
};

export default async function WholesalePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const description = t("ws.desc");
  // Where the matcha is grown and which grades exist, from the products we list for each supplier's brands.
  const facets = await getBrandFacets([...new Set(SUPPLIERS.flatMap((s) => s.brands))]);
  const suppliers: SupplierView[] = SUPPLIERS.map((s) => {
    const regions = new Set<string>();
    const types = new Set<ProductType>();
    for (const b of s.brands) {
      const f = facets[b];
      if (!f) continue;
      f.regions.forEach((r) => regions.add(regionOf(r)));
      if (f.grades.includes("Ceremonial")) types.add("ceremonial");
      if (f.grades.includes("Culinary") || f.grades.includes("Latte grade")) types.add("culinary");
      if (f.organic) types.add("organic");
    }
    if (s.profile) {
      // No brand in the database: use what the supplier states.
      if (s.profile.origins.includes("China")) regions.add("China");
      const text = `${s.profile.products.join(" ")} ${s.profile.organic}`;
      if (/ceremonial/i.test(text)) types.add("ceremonial");
      if (/culinary|latte/i.test(text)) types.add("culinary");
      if (/organic/i.test(text)) types.add("organic");
    }
    return { ...s, regions: [...regions], types: [...types] };
  });
  const brandCount = new Set(SUPPLIERS.flatMap((s) => s.brands)).size;
  const fromBrands = SUPPLIERS.filter((s) => s.brands.length > 0).length;
  const independent = SUPPLIERS.length - fromBrands;
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Wholesale matcha suppliers",
          url: `${SITE_URL}/wholesale`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: SUPPLIERS.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: s.name,
              url: s.profile ? `${SITE_URL}/wholesale/${s.slug}` : `${SITE_URL}/wholesale#${s.slug}`,
            })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("footer.wholesale")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">
          {t("ws.h1")}
        </h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t(independent === 1 ? "ws.lead.one" : "ws.lead.other", { from: fromBrands, brands: brandCount, n: independent })}
        </p>
        <p className="mt-4 text-sm text-ink-muted leading-relaxed">
          {t("ws.lead2")}
        </p>
      </header>

      <div className="mt-8">
        <WholesaleDirectory suppliers={suppliers} regionOrder={[...KNOWN_REGIONS, "Other"]} />
      </div>

      <section className="mt-14 max-w-3xl" aria-labelledby="list-h">
        <h2 id="list-h" className="font-display text-2xl font-semibold text-ink">
          {t("ws.supplier.h")}
        </h2>
        <p className="mt-3 text-ink-muted leading-relaxed">
          {t("ws.supplier.p")}
        </p>
        <p className="mt-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Wholesale%20listing%20request`}
            className="inline-flex items-center rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest"
          >
            {t("ws.supplier.cta")}
          </a>
        </p>
      </section>
    </main>
  );
}
