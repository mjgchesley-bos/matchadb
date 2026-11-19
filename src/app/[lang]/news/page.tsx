import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { getNews } from "@/lib/news";
import type { NewsCategory, NewsItem } from "@/lib/news-seed";
import { SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { pageAlternates } from "@/i18n/seo";

// Refreshed about every half hour.
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const title = "Matcha News: Latest Headlines From Around the World";
  const description = "The latest matcha news in one place: prices and supply, health and research, new cafés, Japan and the tea farms, and culture. Headlines link to the original stories.";
  const alternates = pageAlternates(lang, "/news");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

const SECTIONS: { key: NewsCategory; label: string; blurb: string }[] = [
  { key: "business", label: "Business and supply", blurb: "Prices, shortages, companies and markets" },
  { key: "japan", label: "Japan and the tea farms", blurb: "Uji, growers, harvests and the matcha trade" },
  { key: "health", label: "Health and research", blurb: "What studies and dietitians say" },
  { key: "cafes", label: "Cafés and openings", blurb: "New shops, closures and best-of lists" },
  { key: "culture", label: "Culture", blurb: "The matcha moment, city by city" },
];
const ACCENT: Record<NewsCategory, string> = { business: "border-t-[#2f5d8a]", japan: "border-t-[#b5472f]", health: "border-t-[#3f7d3a]", cafes: "border-t-[#c9a227]", culture: "border-t-[#7a4a8a]" };
const LABEL: Record<NewsCategory, string> = { business: "Business", japan: "Japan", health: "Health", cafes: "Cafés", culture: "Culture" };

const day = (iso: string) => {
  const d = new Date(iso + "T12:00:00Z");
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return "Today";
  if (iso === yest) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
};
const short = (iso: string, approx?: boolean) => (approx ? "about " : "") + new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Story({ s, big }: { s: NewsItem; big?: boolean }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="group block">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-forest">
        {LABEL[s.category]} <span className="text-ink-faint">· {s.source} · {short(s.date, s.approx)}</span>
      </p>
      <h3 className={`mt-1 font-display font-semibold leading-snug text-ink group-hover:text-matcha ${big ? "text-2xl sm:text-4xl leading-tight text-balance" : "text-base"}`}>{s.title}</h3>
    </a>
  );
}

export default async function NewsPage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  const { items, liveCount } = await getNews();
  const lead = items.find((i) => i.category === "japan" || i.category === "business") ?? items[0];
  const rest = items.filter((i) => i !== lead);
  const side = rest.slice(0, 3);
  const bySection = (k: NewsCategory) => items.filter((i) => i.category === k && i !== lead && !side.includes(i)).slice(0, 5);
  const groups: { date: string; list: NewsItem[] }[] = [];
  for (const it of items) {
    const g = groups[groups.length - 1];
    if (g && g.date === it.date) g.list.push(it);
    else groups.push({ date: it.date, list: [it] });
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Matcha news", url: `${SITE_URL}/news`, mainEntity: { "@type": "ItemList", itemListElement: items.slice(0, 20).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: s.url, name: s.title })) } }} />
      <header className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">News</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Matcha news from around the world</h1>
        <p className="mt-4 text-ink-muted leading-relaxed">
          Headlines from publishers worldwide, gathered into one place. Each headline opens the original story on the publisher&apos;s own site; we link to the stories and don&apos;t copy them.
          {liveCount > 0 ? " Updated through the day." : " The live feed is catching up, so this is the latest saved set."}
        </p>
      </header>

      {lead && (
        <section className="mt-8 grid gap-8 rounded-sm border border-line border-t-4 border-t-matcha bg-paper-raised p-6 sm:p-8 lg:grid-cols-[1.6fr_1fr]" aria-label="Top stories">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-forest">Top story</p>
            <Story s={lead} big />
          </div>
          <div className="flex flex-col divide-y divide-line lg:border-l lg:border-line lg:pl-8">
            {side.map((s) => (
              <div key={s.url} className="py-3 first:pt-0 last:pb-0">
                <Story s={s} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-10">
          <div className="grid gap-6 sm:grid-cols-2">
            {SECTIONS.map((sec) => {
              const list = bySection(sec.key);
              if (list.length === 0) return null;
              return (
                <section key={sec.key} className={`rounded-sm border border-line border-t-4 ${ACCENT[sec.key]} bg-paper-raised p-5 ${sec.key === "culture" ? "sm:col-span-2" : ""}`} aria-labelledby={`n-${sec.key}`}>
                  <h2 id={`n-${sec.key}`} className="font-display text-xl font-semibold text-ink">{sec.label}</h2>
                  <p className="text-xs text-ink-faint">{sec.blurb}</p>
                  <ul className={`mt-4 gap-4 ${sec.key === "culture" ? "grid sm:grid-cols-2" : "flex flex-col"}`}>
                    {list.map((s) => (
                      <li key={s.url}>
                        <Story s={s} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        <aside aria-labelledby="n-latest" className="rounded-sm border border-line border-t-4 border-t-matcha bg-paper-raised p-5 lg:sticky lg:top-6 lg:self-start">
          <h2 id="n-latest" className="font-display text-xl font-semibold text-ink">Latest, in order</h2>
          <p className="text-xs text-ink-faint">Newest first, by day</p>
          <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2">
            <ol className="border-l-2 border-line pl-5">
              {groups.map((g) => (
                <li key={g.date} className="relative pb-5">
                  <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-matcha" aria-hidden="true" />
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-forest">{day(g.date)}</p>
                  <ul className="mt-2 flex flex-col gap-3">
                    {g.list.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm leading-snug text-ink hover:text-matcha">{s.title}</a>
                        <span className="block text-xs text-ink-faint">{s.source}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
