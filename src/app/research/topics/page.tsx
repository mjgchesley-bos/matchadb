import type { Metadata } from "next";
import Link from "next/link";
import { getTopicSummary } from "@/lib/studies";
import { TOPICS } from "@/lib/research-topics";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Matcha research by topic — health, chemistry, cultivation and more",
  description: "Browse the scientific research on matcha by subject: L-theanine and caffeine, antioxidants, cognition, metabolism, gut health, safety, cultivation, processing and more.",
  alternates: { canonical: `${SITE_URL}/research/topics` },
};

export default function TopicsIndex() {
  const topics = TOPICS.map((t) => ({ t, sum: getTopicSummary(t.name) })).sort((a, b) => b.sum.total - a.sum.total);
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Matcha research by topic",
          url: `${SITE_URL}/research/topics`,
          isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
          hasPart: topics.map(({ t }) => ({ "@type": "CollectionPage", name: t.heading, url: `${SITE_URL}/research/topics/${t.slug}` })),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/research" className="hover:text-ink">Research library</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">Topics</span>
      </nav>
      <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Matcha research by topic</h1>
      <p className="mt-4 text-lg text-ink-muted max-w-3xl leading-relaxed">
        Every study in the library is tagged by subject. Pick a topic to see what the research covers, what kind of evidence it rests on, and the most recognized and newest papers.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {topics.map(({ t, sum }) => (
          <Link key={t.slug} href={`/research/topics/${t.slug}`} className="border border-line rounded-sm bg-paper-raised p-5 hover:border-matcha hover:bg-matcha-soft transition-colors">
            <span className="font-display text-xl font-semibold text-ink block">{t.name}</span>
            <span className="text-sm text-ink-muted mt-1.5 block leading-relaxed">{t.description}</span>
            <span className="text-xs text-forest font-mono uppercase tracking-wide mt-3 block tabular-nums">
              {sum.total} studies{sum.minYear && sum.maxYear ? ` · ${sum.minYear}–${sum.maxYear}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
