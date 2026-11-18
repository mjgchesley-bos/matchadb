import { NEWS_SEED, type NewsCategory, type NewsItem } from "./news-seed";
import saved from "../../data/news-live.json";

// Matcha headlines for the news page: a live pull from GDELT's open news index (refreshed about every half hour), merged with a saved set so
// the page is never empty if the feed is down or rate-limited. Headlines and links only; every story belongs to its publisher.
const BLOCKED = /(^|\.)(wholefoodsmarket|amazon|walmart|ebay|etsy|target|instacart|aliexpress|temu|alibaba|shopify|pinterest|facebook|instagram|reddit|youtube|tiktok)\./i;
const CLASSIFY: [NewsCategory, RegExp][] = [
  ["japan", /\b(japan|japanese|uji|kyoto|shizuoka|kagoshima|nishio|tencha|tea farm|farmers?|growers?|harvest|aichi)\b/i],
  ["business", /\b(price|prices|shortage|market|sales|revenue|export|exports|import|tariff|supply|business|startup|earnings|brand|company|investor|funding|stock|starbucks|billion|million)\b/i],
  ["health", /\b(health|healthy|study|studies|research|benefit|benefits|antioxidants?|weight|liver|caffeine|dietitian|nutrition|theanine|doctor|science)\b/i],
  ["cafes", /\b(cafe|café|cafes|opens|opening|shop|restaurant|menu|latte|bar|bakery|best matcha|coffee|boba)\b/i],
];
export const categoryOf = (title: string): NewsCategory => CLASSIFY.find(([, re]) => re.test(title))?.[0] ?? "culture";

type Gdelt = { articles?: { url: string; title: string; seendate: string; domain: string; language?: string }[] };

const nameOf = (domain: string) => domain.replace(/^www\./, "");
const isoOf = (seen: string) => `${seen.slice(0, 4)}-${seen.slice(4, 6)}-${seen.slice(6, 8)}`;

let lastGood: NewsItem[] = [];

// GDELT limits how often it answers (it replies 429 now and then), so try a few times, and keep the last good answer for this server instance.
async function live(): Promise<NewsItem[]> {
  const q = new URLSearchParams({ query: "matcha sourcelang:english", mode: "artlist", format: "json", maxrecords: "75", sort: "datedesc", timespan: "10d" });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${q}`, { next: { revalidate: 1800 }, headers: { "User-Agent": "MatchaDBBot/1.0 (+https://www.matchadb.com)" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = (await res.json()) as Gdelt;
        const items = (j.articles ?? [])
          .filter((a) => /matcha/i.test(a.title) && a.title.length <= 150 && !BLOCKED.test(a.domain) && (!a.language || /english/i.test(a.language)))
          .map((a) => ({ title: a.title.replace(/\s+/g, " ").trim(), url: a.url, source: nameOf(a.domain), date: isoOf(a.seendate), category: categoryOf(a.title) }));
        if (items.length) lastGood = items;
        return items;
      }
    } catch {
      /* try again */
    }
    await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
  }
  return lastGood;
}

export async function getNews(): Promise<{ items: NewsItem[]; liveCount: number }> {
  const fresh = await live();
  const seen = new Set<string>();
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
  const items: NewsItem[] = [];
  for (const it of [...fresh, ...(saved as NewsItem[]), ...NEWS_SEED]) {
    const key = norm(it.title);
    if (seen.has(it.url) || seen.has(key)) continue;
    seen.add(it.url);
    seen.add(key);
    items.push(it);
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  // Keep the page to the last ~6 weeks.
  const cutoff = new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10);
  // With no live feed, keep showing the saved set however old it is, rather than an empty page.
  const liveCount = fresh.length + (saved as NewsItem[]).filter((i) => i.date >= new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)).length;
  return { items: liveCount ? items.filter((i) => i.date >= cutoff) : items, liveCount };
}
