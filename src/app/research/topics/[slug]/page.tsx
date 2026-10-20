import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLibraryMeta, getTopicSummary, queryStudies } from "@/lib/studies";
import { TOPICS, topicByName, topicBySlug } from "@/lib/research-topics";
import { StudyCard } from "@/components/StudyCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = topicBySlug(slug);
  if (!t) return {};
  const url = `${SITE_URL}/research/topics/${t.slug}`;
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: url },
    openGraph: { title: t.title, description: t.description, url },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = topicBySlug(slug);
  if (!t) notFound();

  const sum = getTopicSummary(t.name);
  const top = queryStudies({ topics: [t.name], pageSize: 10 }).studies;
  const latest = queryStudies({ topics: [t.name], sort: "newest", pageSize: 5 }).studies;
  const meta = getLibraryMeta();
  const url = `${SITE_URL}/research/topics/${t.slug}`;
  const maxDesign = Math.max(1, ...sum.designs.map((d) => d.count));
  const stats: [string, string][] = [
    [sum.total.toLocaleString(), "studies"],
    [sum.minYear && sum.maxYear ? `${sum.minYear}–${sum.maxYear}` : "—", "years covered"],
    [sum.recent.toLocaleString(), "from the last five years"],
    [sum.openAccess.toLocaleString(), "free to read"],
  ];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: t.heading,
              url,
              description: t.description,
              isPartOf: { "@type": "WebSite", name: "MatchaDB", url: SITE_URL },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: sum.total,
                itemListElement: top.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/research/${s.id}`, name: s.title })),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Research library", item: `${SITE_URL}/research` },
                { "@type": "ListItem", position: 2, name: "Topics", item: `${SITE_URL}/research/topics` },
                { "@type": "ListItem", position: 3, name: t.name, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/research" className="hover:text-ink">Research library</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/research/topics" className="hover:text-ink">Topics</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{t.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Research topic</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{t.heading}</h1>
        <div className="mt-5 flex flex-col gap-4 text-lg text-ink-muted leading-relaxed">
          {t.intro.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Topic at a glance">
        {stats.map(([v, l]) => (
          <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
            <p className="font-display text-2xl text-ink tabular-nums">{v}</p>
            <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
        <div className="border border-line rounded-sm bg-paper-raised px-5 py-4">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">What kind of evidence is this?</h2>
          <ul className="flex flex-col gap-2">
            {sum.designs.map((d) => (
              <li key={d.name} className="grid grid-cols-[minmax(0,13.5rem)_1fr_2rem] items-center gap-3 text-sm">
                <span className="text-ink-muted truncate" title={d.name}>{d.name}</span>
                <span className="h-2 rounded-full bg-matcha-soft overflow-hidden">
                  <span className="block h-full bg-matcha rounded-full" style={{ width: `${(d.count / maxDesign) * 100}%` }} />
                </span>
                <span className="text-ink-faint tabular-nums text-right">{d.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-muted leading-relaxed">{t.lookFor}</p>
        </div>
        <div className="border border-line rounded-sm bg-paper-raised px-5 py-4">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Common keywords</h2>
          <div className="flex flex-wrap gap-2">
            {sum.keywords.map((k) => (
              <Link
                key={k.name}
                href={`/research?q=${encodeURIComponent(k.name.includes(" ") ? `"${k.name}"` : k.name)}&topic=${encodeURIComponent(t.name)}`}
                className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
              >
                {k.name} <span className="text-ink-faint tabular-nums">{k.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Most recognized studies on this topic</h2>
        <p className="mt-1 text-sm text-ink-muted">Ranked by recency, citations, journal standing and study design.</p>
        <div className="mt-5 flex flex-col gap-4">
          {top.map((s) => (
            <StudyCard key={s.id} study={s} />
          ))}
        </div>
        <Link href={`/research?topic=${encodeURIComponent(t.name)}`} className="inline-block mt-6 rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors">
          Search all {sum.total.toLocaleString()} studies on this topic
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Newest research</h2>
        <div className="mt-5 flex flex-col gap-4">
          {latest.map((s) => (
            <StudyCard key={s.id} study={s} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">Related topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {t.related
            .map((n) => topicByName(n))
            .filter((r): r is NonNullable<typeof r> => !!r)
            .map((r) => (
              <Link key={r.slug} href={`/research/topics/${r.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
                <span className="font-display text-lg font-semibold text-ink block">{r.name}</span>
                <span className="text-sm text-ink-muted mt-1 block">{r.description}</span>
              </Link>
            ))}
        </div>
      </section>

      <p className="text-xs text-ink-faint mt-12 max-w-3xl leading-relaxed">
        This page describes what published studies examine; it is not medical advice, and a study being listed is not an endorsement of its findings. Topic tags and study types are assigned
        automatically from each paper&apos;s text (see{" "}
        <Link href="/research#method" className="underline">how the library is built</Link>
        ). Library last rebuilt{" "}
        {new Date(meta.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
      </p>
    </main>
  );
}
