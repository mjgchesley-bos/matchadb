import Link from "next/link";
import { getTopicSummary } from "@/lib/studies";
import { topicByName } from "@/lib/research-topics";

// A short "what does the research say" block for product, brand and region pages:
// links into the research library's topic pages with live study counts, so
// shoppers can go from a tin of matcha to the science behind it.
export function ResearchLinks({ topics, heading = "The science behind matcha", blurb }: { topics: string[]; heading?: string; blurb?: string }) {
  const items = topics
    .map((n) => topicByName(n))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ t, total: getTopicSummary(t.name).total }));
  if (!items.length) return null;
  return (
    <section className="mt-12" aria-label={heading}>
      <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{heading}</h2>
      {blurb && <p className="text-sm text-ink-muted mb-4 max-w-2xl leading-relaxed">{blurb}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(({ t, total }) => (
          <Link key={t.slug} href={`/research/topics/${t.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
            <span className="font-display text-lg font-semibold text-ink block">{t.name}</span>
            <span className="text-xs text-ink-faint font-mono uppercase tracking-wide mt-1 block tabular-nums">{total} studies</span>
          </Link>
        ))}
      </div>
      <Link href="/research" className="inline-block mt-4 text-sm text-matcha hover:text-forest transition-colors">
        Search the full research library &rarr;
      </Link>
    </section>
  );
}
