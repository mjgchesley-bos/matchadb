import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { getLibraryMeta, getTopicSummary, queryStudies } from "@/lib/studies";
import { TOPICS, topicByName, topicBySlug } from "@/lib/research-topics";
import { StudyCard } from "@/components/StudyCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { INTL_LANG, fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { slug, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const c = getC(lang);
  const tp = topicBySlug(slug);
  if (!tp) return {};
  const alternates = pageAlternates(lang, `/research/topics/${tp.slug}`);
  const title = c(`rt.${tp.slug}.title`, tp.title);
  const description = c(`rt.${tp.slug}.desc`, tp.description);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function TopicPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const c = getC(lang);
  const tp = topicBySlug(slug);
  if (!tp) notFound();

  const sum = getTopicSummary(tp.name);
  const top = queryStudies({ topics: [tp.name], pageSize: 10 }).studies;
  const latest = queryStudies({ topics: [tp.name], sort: "newest", pageSize: 5 }).studies;
  const meta = getLibraryMeta();
  const url = pageAlternates(lang, `/research/topics/${tp.slug}`).canonical;
  const maxDesign = Math.max(1, ...sum.designs.map((d) => d.count));
  const heading = c(`rt.${tp.slug}.heading`, tp.heading);
  const description = c(`rt.${tp.slug}.desc`, tp.description);
  const intro = tp.intro.map((p, i) => c(`rt.${tp.slug}.intro.${i}`, p));
  const stats: [string, string][] = [
    [fmtNum(lang, sum.total), t("rs.g.studies")],
    [sum.minYear && sum.maxYear ? `${sum.minYear}–${sum.maxYear}` : "—", t("rs.g.years")],
    [fmtNum(lang, sum.recent), t("rt.recent")],
    [fmtNum(lang, sum.openAccess), t("rs.g.free")],
  ];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: heading,
              url,
              description,
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: sum.total,
                itemListElement: top.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: pageAlternates(lang, `/research/${s.id}`).canonical, name: s.title })),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t("rs.s.crumb"), item: pageAlternates(lang, "/research").canonical },
                { "@type": "ListItem", position: 2, name: t("rt.idx.crumb"), item: pageAlternates(lang, "/research/topics").canonical },
                { "@type": "ListItem", position: 3, name: tv("topic", tp.name), item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint mb-6">
        <Link href="/research" className="hover:text-ink">{t("rs.s.crumb")}</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/research/topics" className="hover:text-ink">{t("rt.idx.crumb")}</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{tv("topic", tp.name)}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("rt.eyebrow")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{heading}</h1>
        <div className="mt-5 flex flex-col gap-4 text-lg text-ink-muted leading-relaxed">
          {intro.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label={t("rt.glance")}>
        {stats.map(([v, l]) => (
          <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
            <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
        <div className="border border-line rounded-sm bg-paper-raised px-5 py-4">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rt.evidence")}</h2>
          <ul className="flex flex-col gap-2">
            {sum.designs.map((d) => (
              <li key={d.name} className="grid grid-cols-[minmax(0,13.5rem)_1fr_2rem] items-center gap-3 text-sm">
                <span className="text-ink-muted truncate" title={tv("design", d.name)}>{tv("design", d.name)}</span>
                <span className="h-2 rounded-full bg-matcha-soft overflow-hidden">
                  <span className="block h-full bg-matcha rounded-full" style={{ width: `${(d.count / maxDesign) * 100}%` }} />
                </span>
                <span className="text-ink-faint tabular-nums text-right">{d.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-muted leading-relaxed">{c(`rt.${tp.slug}.look`, tp.lookFor)}</p>
        </div>
        <div className="border border-line rounded-sm bg-paper-raised px-5 py-4">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rt.keywords")}</h2>
          <div className="flex flex-wrap gap-2">
            {sum.keywords.map((k) => (
              <Link
                key={k.name}
                href={`/research?q=${encodeURIComponent(k.name.includes(" ") ? `"${k.name}"` : k.name)}&topic=${encodeURIComponent(tp.name)}`}
                className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
              >
                {k.name} <span className="text-ink-faint tabular-nums">{k.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("rt.top")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("rt.top.note")}</p>
        <div className="mt-5 flex flex-col gap-4">
          {top.map((s) => (
            <StudyCard key={s.id} study={s} lang={lang} />
          ))}
        </div>
        <Link href={`/research?topic=${encodeURIComponent(tp.name)}`} className="inline-block mt-6 rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors">
          {t("rt.searchAll", { n: fmtNum(lang, sum.total) })}
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("rt.newest")}</h2>
        <div className="mt-5 flex flex-col gap-4">
          {latest.map((s) => (
            <StudyCard key={s.id} study={s} lang={lang} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rt.related")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tp.related
            .map((n) => topicByName(n))
            .filter((r): r is NonNullable<typeof r> => !!r)
            .map((r) => (
              <Link key={r.slug} href={`/research/topics/${r.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{tv("topic", r.name)}</span>
                <span className="text-sm text-ink-muted mt-1 block">{c(`rt.${r.slug}.desc`, r.description)}</span>
              </Link>
            ))}
        </div>
      </section>

      <p className="text-xs text-ink-faint mt-12 max-w-3xl leading-relaxed">
        {rich(
          t("rt.foot", {
            link: "{link}",
            date: new Date(meta.generatedAt).toLocaleDateString(INTL_LANG[lang], { year: "numeric", month: "long", day: "numeric" }),
          }),
          { link: <Link href="/research#method" className="underline">{t("rt.foot.link")}</Link> }
        )}
      </p>
    </main>
  );
}
