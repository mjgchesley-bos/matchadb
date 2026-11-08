import Link from "@/i18n/Link";
import { getTopicSummary } from "@/lib/studies";
import { topicByName } from "@/lib/research-topics";
import { getT, getTV } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

// A short "what does the research say" block for product, brand and region pages:
// links into the research library's topic pages with live study counts, so
// shoppers can go from a tin of matcha to the science behind it.
export function ResearchLinks({ topics, heading, blurb, lang = "en" }: { topics: string[]; heading?: string; blurb?: string; lang?: Locale }) {
  const t = getT(lang);
  const tv = getTV(lang);
  const title = heading ?? t("res.heading");
  const items = topics
    .map((n) => topicByName(n))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((topic) => ({ topic, total: getTopicSummary(topic.name).total }));
  if (!items.length) return null;
  return (
    <section className="mt-12" aria-label={title}>
      <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{title}</h2>
      {blurb && <p className="text-sm text-ink-muted mb-4 max-w-2xl leading-relaxed">{blurb}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(({ topic, total }) => (
          <Link key={topic.slug} href={`/research/topics/${topic.slug}`} className="border border-line rounded-sm bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft transition-colors">
            <span className="font-display text-lg font-semibold text-ink block">{tv("topic", topic.name)}</span>
            <span className="text-xs text-ink-faint font-mono uppercase tracking-wide mt-1 block tabular-nums">{t(total === 1 ? "res.studies.one" : "res.studies.other", { n: total })}</span>
          </Link>
        ))}
      </div>
      <Link href="/research" className="inline-block mt-4 text-sm text-matcha hover:text-forest transition-colors">
        {t("res.search")} &rarr;
      </Link>
    </section>
  );
}
