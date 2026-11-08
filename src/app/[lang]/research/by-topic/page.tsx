import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getTopicSummary } from "@/lib/studies";
import { TOPICS } from "@/lib/research-topics";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { pageAlternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("rt.idx.title"), description: t("rt.idx.desc"), alternates: pageAlternates(lang, "/research/topics") };
}

export default async function TopicsIndex({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const c = getC(lang);
  const topics = TOPICS.map((tp) => ({ tp, sum: getTopicSummary(tp.name) })).sort((a, b) => b.sum.total - a.sum.total);
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha research by topic",
          url: pageAlternates(lang, "/research/topics").canonical,
          isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
          hasPart: topics.map(({ tp }) => ({ "@type": "CollectionPage", name: tp.heading, url: pageAlternates(lang, `/research/topics/${tp.slug}`).canonical })),
        }}
      />
      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint mb-6">
        <Link href="/research" className="hover:text-ink">{t("rs.s.crumb")}</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{t("rt.idx.crumb")}</span>
      </nav>
      <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t("rt.idx.h1")}</h1>
      <p className="mt-4 text-lg text-ink-muted max-w-3xl leading-relaxed">{t("rt.idx.lead")}</p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {topics.map(({ tp, sum }) => (
          <Link key={tp.slug} href={`/research/topics/${tp.slug}`} className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors">
            <span className="font-display text-xl font-semibold text-ink block">{tv("topic", tp.name)}</span>
            <span className="text-sm text-ink-muted mt-1.5 block leading-relaxed">{c(`rt.${tp.slug}.desc`, tp.description)}</span>
            <span className="text-xs text-forest font-mono uppercase tracking-wide mt-3 block tabular-nums">
              {t(sum.total === 1 ? "res.studies.one" : "res.studies.other", { n: sum.total })}
              {sum.minYear && sum.maxYear ? ` · ${sum.minYear}–${sum.maxYear}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
