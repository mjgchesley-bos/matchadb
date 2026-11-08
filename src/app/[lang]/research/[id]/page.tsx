import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import {
  apaCitation,
  bibtexCitation,
  getStudy,
  queryStudies,
  risCitation,
  studyLinks,
  type Study,
} from "@/lib/studies";
import { StudyCard } from "@/components/StudyCard";
import { CopyCitation } from "@/components/CopyCitation";
import { ResearchBookmark } from "@/components/ResearchBookmark";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { topicHref } from "@/lib/research-topics";
import { langOf } from "@/i18n/params";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

// The abstract is shown in full when it is short; very long abstracts are cut
// with a pointer to the source, so the library stays a finding aid and the
// publisher remains the home of the work.
const ABSTRACT_LIMIT = 1800;

function clip(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n).replace(/\s+\S*$/, "")}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { id, lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  const tv = getTV(lang);
  const s = getStudy(Number(id));
  if (!s) return {};
  const title = t("rs.s.title", { title: clip(s.title, 90) });
  const lead = `${tv("design", s.design)}${s.journal ? `, ${s.journal}` : ""}${s.year ? ` (${s.year})` : ""}`;
  const description = clip(s.abstract || t("rs.s.descFallback", { lead }), 155);
  const alternates = pageAlternates(lang, `/research/${s.id}`);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{children}</h2>;
}

export default async function StudyPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { id } = await params;
  const lang = await langOf(params);
  const t = getT(lang);
  const tv = getTV(lang);
  const s = getStudy(Number(id));
  if (!s) notFound();

  const links = studyLinks(s);
  const abstract = clip(s.abstract, ABSTRACT_LIMIT);
  const related = relatedTo(s);
  const sourceLink = links.doi || links.pubmed || links.openAccess;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ScholarlyArticle",
          headline: s.title,
          name: s.title,
          url: `${SITE_URL}/research/${s.id}`,
          ...(s.year ? { datePublished: String(s.year) } : {}),
          ...(s.authors.length ? { author: s.authors.slice(0, 20).map((a) => ({ "@type": "Person", name: a })) } : {}),
          ...(s.journal ? { isPartOf: { "@type": "Periodical", name: s.journal } } : {}),
          ...(s.doi ? { sameAs: `https://doi.org/${s.doi}`, identifier: s.doi } : {}),
          ...(s.abstract ? { abstract: clip(s.abstract, 1000) } : {}),
          about: { "@type": "Thing", name: "Matcha" },
          keywords: [...s.keywords, ...s.topics].slice(0, 15).join(", "),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MatchaDB", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: t("rs.s.crumb"), item: pageAlternates(lang, "/research").canonical },
            { "@type": "ListItem", position: 3, name: clip(s.title, 80), item: `${SITE_URL}/research/${s.id}` },
          ],
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">
          MatchaDB
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/research" className="hover:text-matcha transition-colors">
          {t("rs.s.crumb")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint truncate">{t("rs.s.study", { id: s.id })}</span>
      </nav>

      <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-faint">
        <span className="font-mono text-forest tabular-nums">{s.year ?? t("rs.nd")}</span>
        <span aria-hidden="true">·</span>
        <span>{t(`rs.kind.${s.kind}` as "rs.kind.article")}</span>
        {s.isOa && <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5 text-xs ml-1">{t("rs.free")}</span>}
      </p>
      <h1 className="font-display text-2xl sm:text-4xl font-semibold text-ink leading-tight mt-2">{s.title}</h1>
      <p className="mt-3 text-ink-muted leading-relaxed">
        {s.authors.length ? s.authors.slice(0, 12).join(", ") + (s.authors.length > 12 ? t("rs.s.authorsMore", { n: s.authors.length - 12 }) : "") : t("rs.noAuthors")}
      </p>
      {s.journal && <p className="text-ink-faint text-sm mt-1">{s.journal}</p>}

      <div className="flex flex-wrap gap-3 mt-6">
        {links.doi && (
          <a href={links.doi} target="_blank" rel="noopener noreferrer" className="rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors">
            {t("rs.s.publisher")} &rarr;
          </a>
        )}
        {links.openAccess && links.openAccess !== links.doi && (
          <a href={links.openAccess} target="_blank" rel="noopener noreferrer" className="rounded-full border border-matcha text-matcha px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-matcha-soft transition-colors">
            {t("rs.s.fulltext")} &rarr;
          </a>
        )}
        {links.pubmed && (
          <a href={links.pubmed} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line-strong text-ink-muted px-6 py-2.5 text-sm tracking-wide hover:border-matcha transition-colors">
            PubMed
          </a>
        )}
        {links.pmc && (
          <a href={links.pmc} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line-strong text-ink-muted px-6 py-2.5 text-sm tracking-wide hover:border-matcha transition-colors">
            PubMed Central
          </a>
        )}
        {!sourceLink && <span className="text-sm text-ink-faint italic self-center">{t("rs.s.noLink")}</span>}
      </div>

      <section className="mt-10">
        <Label>{t("rs.s.abstract")}</Label>
        {abstract ? (
          <p className="text-ink leading-relaxed max-w-3xl">{abstract}</p>
        ) : (
          <p className="text-ink-faint italic">{t("rs.s.noAbstract")}</p>
        )}
        {s.abstract.length > ABSTRACT_LIMIT && sourceLink && (
          <p className="text-sm text-ink-faint mt-2">
            {rich(t("rs.s.short", { link: "{link}" }), {
              link: (
                <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                  {t("rs.s.shortLink")}
                </a>
              ),
            })}
          </p>
        )}
        {s.abstract && <p className="text-xs text-ink-faint mt-3">{t("rs.s.absNote")}</p>}
      </section>

      <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label={t("rs.s.about")}>
        <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">{t("rs.s.type")}</p>
          <p className="text-ink font-medium">{tv("design", s.design)}</p>
          {tv("designBlurb", s.design) !== s.design && <p className="text-sm text-ink-muted mt-1">{tv("designBlurb", s.design)}</p>}
          <p className="text-xs text-ink-faint mt-2">{t("rs.s.autoType")}</p>
        </div>
        <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">{t("rs.s.topics")}</p>
          {s.topics.length ? (
            <div className="flex flex-wrap gap-1.5">
              {s.topics.map((tp) => (
                <Link key={tp} href={topicHref(tp)} className="rounded-full bg-matcha-soft text-matcha-ink px-2.5 py-0.5 text-sm hover:bg-matcha hover:text-paper transition-colors">
                  {tv("topic", tp)}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{t("rs.s.noTopic")}</p>
          )}
          <p className="text-xs text-ink-faint mt-2">
            {t(`rs.s.rel.${s.relevance}` as "rs.s.rel.subject", { where: s.matchaIn ? t(`rs.s.in.${s.matchaIn}` as "rs.s.in.title") : "" })}
          </p>
        </div>
      </section>

      {(s.keywords.length > 0 || s.mesh.length > 0) && (
        <section className="mt-8">
          <Label>{t("rs.s.kw")}</Label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[...new Set([...s.keywords, ...s.mesh])].slice(0, 20).map((k) => (
              <Link key={k} href={`/research?q=${encodeURIComponent(k)}`} className="rounded-full border border-line-strong text-ink-muted px-2.5 py-1 hover:border-matcha transition-colors">
                {k}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 max-w-3xl">
        <Label>{t("rs.s.folder")}</Label>
        <ResearchBookmark studyId={s.id} />
      </section>

      <section className="mt-10 max-w-3xl">
        <Label>{t("rs.s.cite")}</Label>
        <CopyCitation formats={{ apa: apaCitation(s), bibtex: bibtexCitation(s), ris: risCitation(s) }} />
        {(s.doi || s.pmid) && (
          <p className="text-xs text-ink-faint mt-3">
            {s.doi && t("rs.s.doi", { v: s.doi })}
            {s.doi && s.pmid && " · "}
            {s.pmid && t("rs.s.pmid", { v: s.pmid })}
            {s.citedBy > 0 && ` · ${t("rs.s.citedBy", { n: fmtNum(lang, s.citedBy) })}`}
          </p>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <Label>{s.topics[0] ? t("rs.s.more", { topic: lang === "en" ? s.topics[0].toLowerCase() : tv("topic", s.topics[0]) }) : t("rs.s.moreGeneric")}</Label>
          <div className="flex flex-col gap-4">
            {related.map((r) => (
              <StudyCard key={r.id} study={r} lang={lang} />
            ))}
          </div>
          <p className="mt-5 text-sm">
            <Link href="/research" className="text-matcha hover:text-forest">
              {t("rs.s.browseAll")} &rarr;
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}

function relatedTo(s: Study): Study[] {
  const topic = s.topics[0];
  if (!topic) return [];
  return queryStudies({ topics: [topic], sort: "cited", pageSize: 12 })
    .studies.filter((r) => r.id !== s.id && r.design !== "Not classified (no abstract)")
    .slice(0, 4);
}
