import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { GUIDES, loadGuide } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const alternates = pageAlternates(lang, "/guides");
  const title = t("g.idx.title");
  const description = t("g.idx.desc");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function GuidesIndex({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const c = getC(lang);
  const description = t("g.idx.desc");
  const loaded = await Promise.all(GUIDES.map((g) => loadGuide(g)));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha guides",
          url: `${SITE_URL}/guides`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: GUIDES.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/guides/${g.slug}`,
              name: g.h1,
            })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("footer.guides")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("g.idx.h1")}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t("g.idx.lead")}
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loaded.map(({ guide, ctx }) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors"
          >
            <span className="font-display text-xl font-semibold text-ink block">{c(`gd.${guide.slug}.h1`, guide.h1)}</span>
            <span className="text-sm text-ink-muted mt-2 block leading-relaxed">{c(`gd.${guide.slug}.desc`, guide.description)}</span>
            <span className="text-xs text-ink-faint mt-3 block tabular-nums">
              {t("g.idx.card", { n: fmtNum(lang, ctx.s.count), price: usd30(ctx.s.median) })}
            </span>
          </Link>
        ))}
        <Link
          href="/guides/what-is-ceremonial-matcha"
          className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors"
        >
          <span className="font-display text-xl font-semibold text-ink block">{t("g.idx.cer.h")}</span>
          <span className="text-sm text-ink-muted mt-2 block leading-relaxed">
            {t("g.idx.cer.d")}
          </span>
          <span className="text-xs text-ink-faint mt-3 block">{t("g.idx.cer.tag")}</span>
        </Link>
      </div>
    </main>
  );
}
