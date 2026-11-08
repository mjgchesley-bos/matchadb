import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { CULTIVARS, loadCultivar } from "@/lib/cultivars";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const alternates = pageAlternates(lang, "/cultivars");
  const title = t("cv.idx.title");
  const description = t("cv.idx.desc");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CultivarsIndex({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const c = getC(lang);
  const description = t("cv.idx.desc");
  const loaded = await Promise.all(CULTIVARS.map((c) => loadCultivar(c)));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha cultivars",
          url: `${SITE_URL}/cultivars`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: CULTIVARS.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/cultivars/${c.slug}`, name: c.h1 })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("footer.cultivars")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("cv.idx.h1")}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t("cv.idx.lead")}
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loaded.map(({ cultivar, s }) => (
          <Link key={cultivar.slug} href={`/cultivars/${cultivar.slug}`} className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors">
            <span className="font-display text-xl font-semibold text-ink block">{lang === "en" ? cultivar.h1 : t("cv.h1", { name: cultivar.name })}</span>
            <span className="text-sm text-ink-muted mt-2 block leading-relaxed">{c(`cvc.${cultivar.slug}.desc`, cultivar.description)}</span>
            <span className="text-xs text-ink-faint mt-3 block tabular-nums">
              {t("cv.idx.card", { n: fmtNum(lang, s.count), b: s.brands, price: usd30(s.median) })}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        {rich(t("cv.idx.new", { link: "{link}" }), { link: <Link href="/guides" className="text-matcha hover:text-forest">{t("cv.idx.guides")}</Link> })}
      </p>
    </main>
  );
}
