import type { Metadata } from "next";
import Link from "next/link";
import { getLibraryFacets, getLibraryMeta, queryStudies, type StudyFilters } from "@/lib/studies";
import { toArr, toNum, toStr } from "@/lib/searchParams";
import { StudyCard } from "@/components/StudyCard";
import { ResearchSearch } from "@/components/ResearchSearch";
import { ResearchFilters } from "@/components/ResearchFilters";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { TOPICS } from "@/lib/research-topics";

const PAGE_SIZE = 25;

// One-click searches for the questions people most often bring to matcha research.
// Each is an ordinary keyword query (the same syntax the search box accepts).
const SEARCH_SHORTCUTS: [string, string][] = [
  ["L-theanine", "theanine"],
  ["EGCG and catechins", "egcg OR catechin"],
  ["Caffeine", "caffeine"],
  ["Focus and memory", "cognition"],
  ["Stress and sleep", "stress OR sleep"],
  ["Weight and metabolism", "obesity OR metabolism"],
  ["Gut health", "microbiome"],
  ["Contaminants", "fluoride OR pesticide OR microplastics"],
  ["Pesticides", "pesticide"],
  ["Shade-growing", "shading"],
  ["Aroma and flavor", "aroma OR flavor"],
  ["Tea ceremony", "ceremony"],
];

// Canonical is the bare library URL: filtered/searched views are re-slices of
// the same set, and each study has its own page that carries the ranking.
export const metadata: Metadata = {
  title: "Matcha Research Library — every scientific study on matcha",
  description:
    "A searchable library of the scientific literature on matcha: clinical trials, chemistry, cultivation, safety and sensory studies, with links to every source. Filter by topic, study type and year.",
  alternates: { canonical: `${SITE_URL}/research` },
};

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          url: `${SITE_URL}/research`,
          description: "A searchable library of the scientific literature on matcha.",
          isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
        }}
      />

      <div className="mb-8 max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Research</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight">The Global Matcha Research Library</h1>
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          {facets.total.toLocaleString()} papers, trials, theses and preprints that study matcha, gathered from PubMed, OpenAlex and Europe PMC, tagged by study type and topic, and linked back to every
          source. We keep abstracts and citations; the full text stays with its publisher.
        </p>
      </div>

      <section className="mb-10 max-w-3xl" aria-label="Search the library">
        <ResearchSearch defaultValue={filters.q} formId="research-filters" />
        <p className="mt-3 text-xs text-ink-faint leading-relaxed">
          Tip: use &quot;quotes&quot; for an exact phrase, <span className="font-mono">OR</span> between alternatives, and a minus to leave a word out, for example{" "}
          <Link href={`/research?q=${encodeURIComponent('fluoride OR pesticide')}`} className="text-matcha hover:text-forest">
            fluoride OR pesticide
          </Link>
          . Related words are matched too, so &ldquo;EGCG&rdquo; also finds &ldquo;epigallocatechin.&rdquo;
        </p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-ink-faint mr-1">Popular searches</span>
          {SEARCH_SHORTCUTS.map(([label, q]) => (
            <Link
              key={label}
              href={`/research?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {!filtered && page === 1 && (
        <section className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6" aria-label="Library at a glance">
          <div className="grid grid-cols-2 gap-3 content-start">
            {[
              [facets.total.toLocaleString(), "studies"],
              [`${facets.minYear}–${facets.maxYear}`, "years covered"],
              [facets.openAccess.toLocaleString(), "free to read"],
              [facets.topics.length.toLocaleString(), "research topics"],
            ].map(([v, l]) => (
              <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
                <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
                <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Studies per year</p>
            <div className="flex items-end gap-1 h-28" role="img" aria-label={`Bar chart of studies per year, ${recent[0].year} to ${recent[recent.length - 1].year}, rising to ${maxYearCount} in the peak year`}>
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
        <section className="mb-10" aria-label="Browse by topic">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest">Browse by topic</h2>
            <Link href="/research/topics" className="text-sm text-matcha hover:text-forest">All topics &rarr;</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <Link key={t.slug} href={`/research/topics/${t.slug}`} className="rounded-full bg-matcha-soft text-matcha-ink px-3.5 py-1.5 text-sm hover:bg-matcha hover:text-paper transition-colors">
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-10">
        <aside className="md:sticky md:top-24 h-fit">
          <ResearchFilters filters={filters} facets={facets} clearHref="/research" />
        </aside>

        <section>
          <p className="text-sm text-ink-muted mb-5">
            {total.toLocaleString()} stud{total === 1 ? "y" : "ies"} {filtered ? "match" : "in the library"}
            {filters.q ? <> for &ldquo;{filters.q}&rdquo;</> : null}
          </p>

          <div className="flex flex-col gap-4">
            {studies.map((s) => (
              <StudyCard key={s.id} study={s} terms={highlight} />
            ))}
          </div>

          {studies.length === 0 && (
            <p className="text-ink-muted mt-8">
              {filters.q ? <>Nothing matched &ldquo;{filters.q}&rdquo;. </> : "No studies match those filters. "}
              Try a broader or single word, remove some filters, or{" "}
              <Link href={filters.q ? `/research?q=${encodeURIComponent(filters.q)}&mentions=1` : "/research?mentions=1"} className="text-matcha hover:text-forest">
                include papers that mention matcha only in passing
              </Link>
              .
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10 text-sm">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="text-ink-muted hover:text-ink transition-colors">
                  &larr; Previous
                </Link>
              )}
              <span className="text-ink-faint font-mono">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="text-ink-muted hover:text-ink transition-colors">
                  Next &rarr;
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="mt-16 pt-8 border-t border-line max-w-3xl" id="method">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">How this library is built</h2>
        <div className="text-ink-muted leading-relaxed flex flex-col gap-3 text-[0.95rem]">
          <p>
            Every record comes from three open scholarly indexes — PubMed, OpenAlex and Europe PMC — searched for the word &ldquo;matcha.&rdquo; Records are merged by DOI and PubMed ID so each study
            appears once. A paper is kept only if matcha appears in its title, abstract, author keywords or subject terms and the text is about tea or food, which filters out the surname Matcha, software called
            Matcha, and the Scandinavian verb &ldquo;matcha&rdquo; (to match).
          </p>
          <p>
            Study type and topic tags are assigned automatically from each paper&apos;s own title, abstract and subject terms using fixed keyword rules — no guesses, and papers without an abstract are marked as
            unclassified. Automatic tagging is imperfect, so treat tags as a way to narrow a search, not as a verdict on a paper&apos;s quality. A study being listed here is not an endorsement of its findings.
          </p>
          <p>
            Coverage: this is every indexed paper that names matcha, not every study of green tea or its compounds (those are far more numerous). Papers that mention matcha only in passing are hidden by default.
            Work that never uses the word &ldquo;matcha,&rdquo; and publications outside these indexes, are not included. The library was last rebuilt{" "}
            {new Date(meta.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
          </p>
          <p>
            Spot a paper that doesn&apos;t belong, or one that&apos;s missing?{" "}
            {CONTACT_EMAIL ? (
              <a className="text-matcha hover:text-forest" href={`mailto:${CONTACT_EMAIL}?subject=Matcha%20Research%20Library`}>
                Tell us
              </a>
            ) : (
              <Link className="text-matcha hover:text-forest" href="/contact">
                Tell us
              </Link>
            )}
            .
          </p>
        </div>
      </section>
    </main>
  );
}
