import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { PAIRS, loadComparison, pairSlug } from "@/lib/compare";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const alternates = pageAlternates(lang, "/compare");
  const title = t("cmp.idx.title");
  const description = t("cmp.idx.desc");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function CompareIndex({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const description = t("cmp.idx.desc");
  const loaded = await Promise.all(PAIRS.map(([a, b]) => loadComparison(a, b)));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha brand comparisons",
          url: `${SITE_URL}/compare`,
          description,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: PAIRS.map(([a, b], i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/compare/${pairSlug(a, b)}`, name: `${a} vs ${b}` })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("footer.compare")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("cmp.idx.h1")}</h1>
        <p className="mt-5 text-lg text-ink-muted leading-relaxed">
          {t("cmp.idx.lead")}
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PAIRS.map(([a, b], i) => {
          const { a: A, b: B } = loaded[i];
          return (
            <Link key={pairSlug(a, b)} href={`/compare/${pairSlug(a, b)}`} className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors">
              <span className="font-display text-xl font-semibold text-ink block">{a} vs {b}</span>
              <span className="text-xs text-ink-faint mt-3 block tabular-nums">
                {t("cmp.idx.card", { a: usd30(A.powders.median), b: usd30(B.powders.median), na: A.total, nb: B.total })}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
