import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DESIGN_BLURB,
  KIND_LABEL,
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
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { topicHref } from "@/lib/research-topics";

// The abstract is shown in full when it is short; very long abstracts are cut
// with a pointer to the source, so the library stays a finding aid and the
// publisher remains the home of the work.
const ABSTRACT_LIMIT = 1800;

function clip(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n).replace(/\s+\S*$/, "")}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = getStudy(Number(id));
  if (!s) return {};
  const title = `${clip(s.title, 90)} — Matcha Research Library`;
  const description = clip(s.abstract || `${s.design}${s.journal ? `, ${s.journal}` : ""}${s.year ? ` (${s.year})` : ""}. Citation, abstract and links to the source.`, 155);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/research/${s.id}` },
    openGraph: { title, description, url: `${SITE_URL}/research/${s.id}` },
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{children}</h2>;
}

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
            { "@type": "ListItem", position: 2, name: "Research library", item: `${SITE_URL}/research` },
            { "@type": "ListItem", position: 3, name: clip(s.title, 80), item: `${SITE_URL}/research/${s.id}` },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/" className="hover:text-matcha transition-colors">
          MatchaDB
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/research" className="hover:text-matcha transition-colors">
          Research library
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-faint truncate">Study {s.id}</span>
      </nav>

      <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-faint">
        <span className="font-mono text-forest tabular-nums">{s.year ?? "n.d."}</span>
        <span aria-hidden="true">·</span>
        <span>{KIND_LABEL[s.kind]}</span>
        {s.isOa && <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5 text-xs ml-1">Free to read</span>}
      </p>
      <h1 className="font-display text-2xl sm:text-4xl font-semibold text-ink leading-tight mt-2">{s.title}</h1>
      <p className="mt-3 text-ink-muted leading-relaxed">
        {s.authors.length ? s.authors.slice(0, 12).join(", ") + (s.authors.length > 12 ? `, and ${s.authors.length - 12} more` : "") : "Authors not listed"}
      </p>
      {s.journal && <p className="text-ink-faint text-sm mt-1">{s.journal}</p>}

      <div className="flex flex-wrap gap-3 mt-6">
        {links.doi && (
          <a href={links.doi} target="_blank" rel="noopener noreferrer" className="rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors">
            Read at the publisher &rarr;
          </a>
        )}
        {links.openAccess && links.openAccess !== links.doi && (
          <a href={links.openAccess} target="_blank" rel="noopener noreferrer" className="rounded-full border border-matcha text-matcha px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-matcha-soft transition-colors">
            Free full text &rarr;
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
        {!sourceLink && <span className="text-sm text-ink-faint italic self-center">No online link was recorded for this study.</span>}
      </div>

      <section className="mt-10">
        <Label>Abstract</Label>
        {abstract ? (
          <p className="text-ink leading-relaxed max-w-3xl">{abstract}</p>
        ) : (
          <p className="text-ink-faint italic">No abstract is available for this record.</p>
        )}
        {s.abstract.length > ABSTRACT_LIMIT && sourceLink && (
          <p className="text-sm text-ink-faint mt-2">
            Abstract shortened.{" "}
            <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
              Read the full abstract at the source
            </a>
            .
          </p>
        )}
        {s.abstract && <p className="text-xs text-ink-faint mt-3">Abstract text comes from PubMed, OpenAlex or Europe PMC and belongs to the authors and publisher.</p>}
      </section>

      <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="About this study">
        <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Study type</p>
          <p className="text-ink font-medium">{s.design}</p>
          {DESIGN_BLURB[s.design] && <p className="text-sm text-ink-muted mt-1">{DESIGN_BLURB[s.design]}</p>}
          <p className="text-xs text-ink-faint mt-2">Assigned automatically from the title, abstract and subject terms.</p>
        </div>
        <div className="border border-line rounded-sm bg-paper-raised px-4 py-3">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Topics</p>
          {s.topics.length ? (
            <div className="flex flex-wrap gap-1.5">
              {s.topics.map((t) => (
                <Link key={t} href={topicHref(t)} className="rounded-full bg-matcha-soft text-matcha-ink px-2.5 py-0.5 text-sm hover:bg-matcha hover:text-paper transition-colors">
                  {t}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No topic could be assigned.</p>
          )}
          <p className="text-xs text-ink-faint mt-2">
            Matcha is {s.relevance === "subject" ? "a main subject" : s.relevance === "studied" ? "studied" : "mentioned in passing"} here
            {s.matchaIn ? ` (named in the ${s.matchaIn})` : ""}.
          </p>
        </div>
      </section>

      {(s.keywords.length > 0 || s.mesh.length > 0) && (
        <section className="mt-8">
          <Label>Keywords and subject terms</Label>
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
        <Label>Cite this study</Label>
        <CopyCitation formats={{ apa: apaCitation(s), bibtex: bibtexCitation(s), ris: risCitation(s) }} />
        {(s.doi || s.pmid) && (
          <p className="text-xs text-ink-faint mt-3">
            {s.doi && <>DOI: {s.doi}</>}
            {s.doi && s.pmid && " · "}
            {s.pmid && <>PubMed ID: {s.pmid}</>}
            {s.citedBy > 0 && <> · Cited by {s.citedBy.toLocaleString()} (OpenAlex)</>}
          </p>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <Label>More on {s.topics[0] ? s.topics[0].toLowerCase() : "this subject"}</Label>
          <div className="flex flex-col gap-4">
            {related.map((r) => (
              <StudyCard key={r.id} study={r} />
            ))}
          </div>
          <p className="mt-5 text-sm">
            <Link href="/research" className="text-matcha hover:text-forest">
              Browse the whole library &rarr;
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
