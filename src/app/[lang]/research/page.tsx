import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getLibraryFacets, getLibraryMeta, queryStudies, type StudyFilters } from "@/lib/studies";
import { toArr, toNum, toStr } from "@/lib/searchParams";
import { StudyCard } from "@/components/StudyCard";
import { ResearchSearch } from "@/components/ResearchSearch";
import { ResearchFilters } from "@/components/ResearchFilters";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { TOPICS } from "@/lib/research-topics";
import { langOf } from "@/i18n/params";
import { INTL_LANG, fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

const PAGE_SIZE = 25;

// One-click searches for the questions people most often bring to matcha research.
// Each is an ordinary keyword query (the same syntax the search box accepts).
const SEARCH_SHORTCUTS: string[] = [
  "theanine",
  "egcg OR catechin",
  "caffeine",
  "cognition",
  "stress OR sleep",
  "obesity OR metabolism",
  "microbiome",
  "fluoride OR pesticide OR microplastics",
  "pesticide",
  "shading",
  "aroma OR flavor",
  "ceremony",
];

// Canonical is the bare library URL: filtered/searched views are re-slices of
// the same set, and each study has its own page that carries the ranking.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("rs.title"), description: t("rs.desc"), alternates: pageAlternates(lang, "/research") };
}

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const sp = await searchParams;
  const filters: StudyFilters = {
    q: toStr(sp.q)?.trim() || undefined,
    designs: toArr(sp.design),
    topics: toArr(sp.topic),
    kinds: toArr(sp.kind),
    yearFrom: toNum(sp.from),
    yearTo: toNum(sp.to),
    openAccessOnly: toStr(sp.oa) === "1",
    includeMentions: toStr(sp.mentions) === "1",
    sort: (toStr(sp.sort) as StudyFilters["sort"]) || undefined,
    page: toNum(sp.page) || 1,
    pageSize: PAGE_SIZE,
  };

  const facets = getLibraryFacets(filters.includeMentions);
  const meta = getLibraryMeta();
  const { studies, total, page, totalPages, highlight } = queryStudies(filters);
  const filtered = !!(filters.q || filters.designs?.length || filters.topics?.length || filters.kinds?.length || filters.yearFrom || filters.yearTo || filters.openAccessOnly);
  const maxYearCount = Math.max(...facets.byYear.map((y) => y.count));
  const recent = facets.byYear.filter((y) => y.year >= 2005);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || !v) continue;
      for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
    }
    params.set("page", String(p));
    return `/research?${params.toString()}`;
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha Research Library",
          url: pageAlternates(lang, "/research").canonical,
          description: "A searchable library of the scientific literature on matcha.",
          isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
        }}
      />

      <div className="mb-8 max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("footer.research")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight">{t("rs.h1")}</h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          {t("rs.lead", { n: fmtNum(lang, facets.total) })}
        </p>
      </div>

      <section className="mb-10 max-w-3xl" aria-label={t("rs.search.aria")}>
        <ResearchSearch defaultValue={filters.q} formId="research-filters" />
        <p className="mt-3 text-xs text-ink-faint leading-relaxed">
          {rich(t("rs.tip", { link: "{link}" }), {
            link: (
              <Link href={`/research?q=${encodeURIComponent("fluoride OR pesticide")}`} className="text-matcha hover:text-forest">
                fluoride OR pesticide
              </Link>
            ),
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-ink-faint mr-1">{t("rs.popular")}</span>
          {SEARCH_SHORTCUTS.map((q, i) => (
            <Link
              key={q}
              href={`/research?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
            >
              {t(`rs.sc.${i}` as "rs.sc.0")}
            </Link>
          ))}
        </div>
      </section>

      {!filtered && page === 1 && (
        <section className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6" aria-label={t("rs.glance")}>
          <div className="grid grid-cols-2 gap-3 content-start">
            {[
              [fmtNum(lang, facets.total), t("rs.g.studies")],
              [`${facets.minYear}–${facets.maxYear}`, t("rs.g.years")],
              [fmtNum(lang, facets.openAccess), t("rs.g.free")],
              [fmtNum(lang, facets.topics.length), t("rs.g.topics")],
            ].map(([v, l]) => (
              <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
                <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
                <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("rs.perYear")}</p>
            <div className="flex items-end gap-1 h-28" role="img" aria-label={t("rs.chart.aria", { from: recent[0].year, to: recent[recent.length - 1].year, max: maxYearCount })}>
              {recent.map((y) => (
                <div key={y.year} className="flex-1 flex flex-col items-center justify-end h-full" title={`${y.year}: ${y.count}`}>
                  <div className="w-full bg-matcha rounded-t-sm" style={{ height: `${Math.max(3, (y.count / maxYearCount) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[0.7rem] text-ink-faint font-mono mt-1.5 tabular-nums">
              <span>{recent[0].year}</span>
              <span>{recent[recent.length - 1].year}</span>
            </div>
          </div>
        </section>
      )}

      {!filtered && page === 1 && (
        <section className="mb-10" aria-label={t("rs.browse")}>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest">{t("rs.browse")}</h2>
            <Link href="/research/topics" className="text-sm text-matcha hover:text-forest">{t("rs.allTopics")} &rarr;</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((tp) => (
              <Link key={tp.slug} href={`/research/topics/${tp.slug}`} className="rounded-full bg-matcha-soft text-matcha-ink px-3.5 py-1.5 text-sm hover:bg-matcha hover:text-paper transition-colors">
                {tv("topic", tp.name)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-10">
        <aside className="md:sticky md:top-24 h-fit">
          <ResearchFilters filters={filters} facets={facets} clearHref="/research" lang={lang} />
        </aside>

        <section>
          <p className="text-sm text-ink-muted mb-5">
            {t(`rs.count.${filtered ? "match" : "lib"}.${total === 1 ? "one" : "other"}` as "rs.count.lib.one", { n: fmtNum(lang, total) })}
            {filters.q ? t("rs.forQuery", { q: filters.q }) : null}
          </p>

          <div className="flex flex-col gap-4">
            {studies.map((s) => (
              <StudyCard key={s.id} study={s} terms={highlight} lang={lang} />
            ))}
          </div>

          {studies.length === 0 && (
            <p className="text-ink-muted mt-8">
              {rich(t(filters.q ? "rs.empty.q" : "rs.empty.nq", { q: filters.q ?? "", link: "{link}" }), {
                link: (
                  <Link href={filters.q ? `/research?q=${encodeURIComponent(filters.q)}&mentions=1` : "/research?mentions=1"} className="text-matcha hover:text-forest">
                    {t("rs.empty.link")}
                  </Link>
                ),
              })}
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10 text-sm">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="text-ink-muted hover:text-ink transition-colors">
                  &larr; {t("rs.prev")}
                </Link>
              )}
              <span className="text-ink-faint font-mono">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="text-ink-muted hover:text-ink transition-colors">
                  {t("rs.next")} &rarr;
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="mt-16 pt-8 border-t border-line max-w-3xl" id="method">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{t("rs.method.h")}</h2>
        <div className="text-ink-muted leading-relaxed flex flex-col gap-3 text-[0.95rem]">
          <p>{t("rs.method.1")}</p>
          <p>{t("rs.method.2")}</p>
          <p>{t("rs.method.3", { date: new Date(meta.generatedAt).toLocaleDateString(INTL_LANG[lang], { year: "numeric", month: "long", day: "numeric" }) })}</p>
          <p>
            {rich(t("rs.method.4", { link: "{link}" }), {
              link: CONTACT_EMAIL ? (
                <a className="text-matcha hover:text-forest" href={`mailto:${CONTACT_EMAIL}?subject=Matcha%20Research%20Library`}>
                  {t("ws.slug.tell")}
                </a>
              ) : (
                <Link className="text-matcha hover:text-forest" href="/contact">
                  {t("ws.slug.tell")}
                </Link>
              ),
            })}
          </p>
        </div>
      </section>
    </main>
  );
}
