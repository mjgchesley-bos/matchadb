import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getGuideRows, groupBy, summarize } from "@/lib/guide-data";
import { getDb } from "@/lib/db";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { usd30 } from "@/lib/unit-price";
import { langOf } from "@/i18n/params";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { rich } from "@/i18n/rich";
import { pageAlternates } from "@/i18n/seo";

const PATH = "/guides/what-is-ceremonial-matcha";
const EN_TITLE = "What Is Ceremonial Matcha? Origin and Meaning";
const EN_DESC =
  "Where the term \"ceremonial grade\" matcha came from, how it relates to the Japanese tea ceremony, what it does and does not guarantee today, and what our price data shows.";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const c = getC(lang);
  const alternates = pageAlternates(lang, PATH);
  const title = c("wc.title", EN_TITLE);
  const description = c("wc.desc", EN_DESC);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

const TIMELINE: { when: string; what: string }[] = [
  {
    when: "Around 1191",
    what: "The Zen monk Eisai returns from China with the Song-dynasty way of preparing powdered tea: ground leaf whisked into hot water. Eisai wrote the Kissa Yōjōki (\"Drinking Tea for Health\"), which he presented to the shogun Minamoto no Sanetomo in 1214. Tea was then treated as medicine and as an aid to meditation.",
  },
  {
    when: "13th century",
    what: "Eisai's disciple Myōe plants tea at Togano'o and in Uji, near Kyoto. Uji becomes Japan's most prestigious tea-growing area, a reputation it still holds.",
  },
  {
    when: "14th century",
    what: "Stone mills made for tea appear, producing a finer powder than the earlier grinders did.",
  },
  {
    when: "15th to 16th century",
    what: "Growers in Uji cover tea bushes before harvest. The practice was long dated to the late 1500s, but soil analysis of Uji plantations suggests it began by the first half of the 1400s. Shading turns the leaf deep green and builds umami, and the leaf prepared for grinding is called tencha. Before this, powdered tea was brownish.",
  },
  {
    when: "16th century",
    what: "Tea masters such as Murata Jukō and Sen no Rikyū favor simplicity over display. Their approach grows into chanoyu, sadō or chadō: the Japanese tea ceremony, built around preparing and serving matcha.",
  },
  {
    when: "Edo period (1603 to 1867)",
    what: "Official tea masters in Uji hold exclusive rights to shaded cultivation and to high-grade matcha, supplying the shogun and the court. The oldest known matcha brand name, Baba Mukashi, dates from this world.",
  },
  {
    when: "After the Edo period",
    what: "The Uji privileges end and shaded cultivation spreads to other regions of Japan. The tea ceremony continues through schools such as Urasenke and Omotesenke.",
  },
  {
    when: "Late 20th and 21st century",
    what: "Matcha becomes a global product, sold as a drink and as a food ingredient. Sellers need words in English for the difference. \"Ceremonial\" and \"culinary\" are the ones that stick.",
  },
];

const SOURCES: { label: string; url: string }[] = [
  { label: "Wikipedia: Matcha (history and sources)", url: "https://en.wikipedia.org/wiki/Matcha" },
  { label: "Tezumi: Why \"ceremonial grade\" is meaningless", url: "https://www.tezumi.com/blogs/tezumi-insights/why-ceremonial-grade-is-meaningless" },
  { label: "Far East Tea Company: ceremonial grade matcha", url: "https://fareastteacompany.com/blogs/fareastteaclub/ceremonial-grade-matcha" },
  { label: "First Agri: ceremonial vs culinary matcha", url: "https://first-agri.jp/matcha/columns/ceremonial-vs-culinary-matcha" },
];

async function mukashiCount() {
  const db = await getDb();
  const res = db.exec("SELECT COUNT(*), COUNT(DISTINCT brand_id) FROM products WHERE not_found = 0 AND product_name LIKE '%mukashi%'");
  const [n, b] = res[0].values[0] as [number, number];
  return { n, b };
}

export default async function WhatIsCeremonialPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const c = getC(lang);
  const url = pageAlternates(lang, PATH).canonical;
  const description = c("wc.desc", EN_DESC);
  const [rows, ceremonialRows, koichaRows, usuchaRows, muk] = await Promise.all([
    getGuideRows({}),
    getGuideRows({ grades: ["Ceremonial"] }),
    getGuideRows({ grades: ["Koicha"] }),
    getGuideRows({ grades: ["Usucha"] }),
    mukashiCount(),
  ]);
  const all = summarize(rows);
  const cer = summarize(ceremonialRows);
  const koi = summarize(koichaRows);
  const usu = summarize(usuchaRows);
  const grades = groupBy(rows, "grade", 1);
  const culinary = grades.find((g) => g.name === "Culinary");
  const share = rows.length ? Math.round((cer.count / rows.length) * 100) : 0;
  const withRegion = ceremonialRows.length ? Math.round((ceremonialRows.filter((r) => r.region).length / ceremonialRows.length) * 100) : 0;
  const withCultivar = ceremonialRows.length ? Math.round((ceremonialRows.filter((r) => r.cultivar).length / ceremonialRows.length) * 100) : 0;
  const heading = t("g.idx.cer.h");
  const link = "text-matcha hover:text-forest";

  const faq: { q: string; a: string }[] = [
    {
      q: c("wc.faq.0.q", "Is ceremonial grade matcha used in the Japanese tea ceremony?"),
      a: c(
        "wc.faq.0.a",
        "Not necessarily. Japanese tea houses sell matcha in lines made for koicha (thick tea) and usucha (thin tea), often under traditional names, which is the closer equivalent in Japan. \"Ceremonial grade\" on an export product is an English label with no fixed link to any of them."
      ),
    },
    {
      q: c("wc.faq.1.q", "Who decides what counts as ceremonial grade?"),
      a: c(
        "wc.faq.1.a",
        "Each brand decides. To our knowledge there is no Japanese or international standard that defines the term, and nobody audits it. Several tea sellers say the same in their own explanations of the label."
      ),
    },
    {
      q: c("wc.faq.2.q", "Is ceremonial matcha always the highest quality?"),
      a: c(
        "wc.faq.2.a",
        "No. The label sets no floor and no ceiling. In our data, powders labeled ceremonial run from {min} to {max} per 30 g, with the middle half between {lo} and {hi}.",
        { min: usd30(cer.min), max: usd30(cer.max), lo: usd30(cer.p25), hi: usd30(cer.p75) }
      ),
    },
    {
      q: c("wc.faq.3.q", "Can I use ceremonial matcha for lattes or baking?"),
      a: c(
        "wc.faq.3.a",
        "Yes, nothing stops you, but milk, sugar and heat hide much of what a ceremonial grade is priced for. Our ceremonial vs culinary guide compares the two on price and use."
      ),
    },
  ];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: heading,
              description,
              url,
              mainEntityOfPage: url,
              dateModified: new Date().toISOString().slice(0, 10),
              author: { "@type": "Organization", name: "MatchaDB", url: SITE_URL },
              publisher: { "@type": "Organization", name: "MatchaDB", url: SITE_URL },
            },
            { "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t("footer.guides"), item: pageAlternates(lang, "/guides").canonical },
                { "@type": "ListItem", position: 2, name: heading, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label={t("prod.crumb.aria")} className="text-sm text-ink-faint mb-6">
        <Link href="/guides" className="hover:text-ink">{t("footer.guides")}</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{heading}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{t("g.idx.cer.tag")}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">{heading}</h1>
      </header>

      <section className="mt-6 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-label={c("wc.short.h", "The short answer")}>
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{c("wc.short.h", "The short answer")}</h2>
        <p className="text-lg text-ink leading-relaxed">
          {c(
            "wc.short.p",
            "“Ceremonial grade” is an English-language label for matcha made to be whisked with water and drunk on its own. It is not a Japanese grade, and no government or industry body defines it. The tea ceremony it borrows its name from is real and centuries old. The label is a much later shorthand from the export trade, and it means whatever the seller means by it."
          )}
        </p>
      </section>

      <div className="mt-10 max-w-3xl flex flex-col gap-10 text-ink-muted leading-relaxed">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{c("wc.ceremony.h", "The ceremony behind the word")}</h2>
          <p className="mt-3">
            {c(
              "wc.ceremony.p",
              "The word “ceremonial” points to the Japanese tea ceremony, known as chanoyu or sadō, in which a host prepares and serves matcha to guests. Matcha and the ceremony grew up together, over about four centuries:"
            )}
          </p>
          <ol className="mt-5 flex flex-col gap-4 border-l-2 border-line pl-5">
            {TIMELINE.map((tl, i) => (
              <li key={tl.when}>
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-forest">{c(`wc.tl.${i}.when`, tl.when)}</p>
                <p className="mt-1">{c(`wc.tl.${i}.what`, tl.what)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{c("wc.trade.h", "What the Japanese trade actually calls things")}</h2>
          <p className="mt-3">
            {c(
              "wc.trade.p1",
              "Japanese tea houses do not sort matcha into “ceremonial” and “culinary.” Their vocabulary is more specific. The raw material is tencha, the shaded leaf before it is milled. Within the tea ceremony there are two preparations, koicha (thick tea, a small amount of powder in little water) and usucha (thin tea, whisked into a froth), and many houses make separate lines for each. Lines carry traditional names rather than grades. Names ending in -mukashi (“old days”) are the classic pattern, going back at least to Baba Mukashi, the oldest known matcha brand name."
            )}
          </p>
          <p className="mt-3">
            {c(
              "wc.trade.p2",
              "The pattern is alive in the database: {n} products from {b} brands carry a mukashi name. Brands in the database also label {koi} plain powders as koicha and {usu} as usucha. Those words describe how the tea is meant to be prepared rather than ranking it the way “ceremonial grade” sounds like it does.",
              { n: muk.n, b: muk.b, koi: koi.count, usu: usu.count }
            )}
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{c("wc.how.h", "How “ceremonial grade” appeared")}</h2>
          <p className="mt-3">
            {c(
              "wc.how.p1",
              "As matcha began to sell abroad, sellers needed a quick way to tell a buyer which powder to whisk with water and which to put in a latte or a cake. English supplied two words: “ceremonial” for the first and “culinary” for the second. One Japanese tea supplier describes the translation this way: lines meant for koicha and usucha became “ceremonial,” and everything else became “culinary.”"
            )}
          </p>
          <p className="mt-3">
            {c(
              "wc.how.p2",
              "We could not find a documented first use of the phrase or a single company that coined it, so we do not claim one. What sellers across the trade agree on, including some who use the label themselves, is that it was never a Japanese classification and has no legal definition. Matcha as a product is defined in standards and in Japanese food-labeling guidance; to our knowledge none of them defines a ceremonial tier."
            )}
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{c("wc.today.h", "What it means today")}</h2>
          <ul className="mt-3 flex flex-col gap-3 list-disc pl-5">
            {(
              [
                ["A statement of intended use.", "A brand calling a powder ceremonial is saying it should taste good whisked with water alone, without milk or sweetener to cover it."],
                ["A price signal, not a quality guarantee.", "Ceremonial powders cost more than culinary ones on average, but the label alone does not tell you how much more or whether it is worth it."],
                ["Self-assigned.", "There is no testing body, no certificate and no penalty for using the word loosely. Two brands can use it for very different matcha."],
                ["A starting point for questions.", "The details that do say something are cultivar, harvest, growing region, shading, milling and the producer. A brand that gives them is giving you more than the label can."],
              ] as const
            ).map(([b, tx], i) => (
              <li key={i}>
                <strong className="text-ink">{c(`wc.today.${i + 1}.b`, b)}</strong> {c(`wc.today.${i + 1}.t`, tx)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{c("wc.data.h", "What our data shows")}</h2>
          <p className="mt-3">
            {c(
              "wc.data.p1",
              "We compare plain matcha powders with a verified price and a pack of at least 20 grams. Of {total} such powders, {n} ({share}%) are labeled ceremonial by their brands.",
              { total: fmtNum(lang, rows.length), n: fmtNum(lang, cer.count), share }
            )}
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [usd30(cer.median), c("wc.data.s1", "median per 30 g, ceremonial")],
              [culinary ? usd30(culinary.median) : t("gt.na"), c("wc.data.s2", "median per 30 g, culinary")],
              [cer.p25 != null && cer.p75 != null ? `${usd30(cer.p25)}–${usd30(cer.p75)}` : t("gt.na"), c("wc.data.s3", "middle half, ceremonial")],
              [cer.min != null && cer.max != null ? `${usd30(cer.min)}–${usd30(cer.max)}` : t("gt.na"), c("wc.data.s4", "full range, ceremonial")],
            ].map(([v, l]) => (
              <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
                <p className="font-display text-xl text-ink tabular-nums">{v}</p>
                <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-5">
            {c(
              "wc.data.p2",
              "The spread is the point. Across all matcha powders in the database the median is {median} per 30 g, and the ceremonial label covers everything from the cheapest to the most expensive tins. On the brands' own pages, {withRegion}% of ceremonial powders name a growing region and {withCultivar}% name a cultivar, so the label is the least informative thing about them. That is why we compare those details instead.",
              { median: usd30(all.median), withRegion, withCultivar }
            )}
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{c("wc.read.h", "Reading the label sensibly")}</h2>
          <ul className="mt-3 flex flex-col gap-2 list-disc pl-5">
            <li>{c("wc.read.1", "Treat “ceremonial” as the brand telling you what the powder is for, and look for the facts behind it.")}</li>
            <li>{c("wc.read.2", "Check whether the brand names a region and cultivar, and when it was harvested.")}</li>
            <li>
              {rich(c("wc.read.3", "Compare price per 30 g, not tin price. Our {link} shows typical ranges.", { link: "{link}" }), {
                link: (
                  <Link href="/guides/how-much-does-matcha-cost" className={link}>
                    {c("wc.read.3.link", "cost guide")}
                  </Link>
                ),
              })}
            </li>
            <li>
              {rich(c("wc.read.4", "If you want the traditional framing, look for koicha and usucha lines from Japanese tea houses; see {link}.", { link: "{link}" }), {
                link: (
                  <Link href="/guides/usucha-vs-koicha-matcha" className={link}>
                    {c("wc.read.4.link", "usucha vs koicha")}
                  </Link>
                ),
              })}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">{t("cv.faq.h")}</h2>
          <div className="mt-5 flex flex-col gap-6">
            {faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-display text-lg font-semibold text-ink">{f.q}</h3>
                <p className="mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-line rounded-sm bg-paper-raised px-5 py-4" aria-labelledby="ceremonial-sources">
          <h2 id="ceremonial-sources" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{c("wc.src.h", "Sources and notes")}</h2>
          <p className="text-sm">
            {c(
              "wc.src.p",
              "The history summarizes published accounts, mainly the cited history on Wikipedia, and dates for shading and the Edo-period monopoly come from those. Details differ between sources, so we state dates conservatively. The comments on the label come from tea sellers' own explanations, and several of them sell matcha, which is worth keeping in mind. The numbers above come from the MatchaDB product table and refresh whenever the site is rebuilt."
            )}
          </p>
          <ul className="mt-3 text-sm flex flex-col gap-1">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm">
          {rich(c("wc.related", "Related: {a}, {b}, {c}.", { a: "{a}", b: "{b}", c: "{c}" }), {
            a: <Link href="/guides/ceremonial-vs-culinary-matcha" className={link}>{c("wc.related.a", "ceremonial vs culinary matcha")}</Link>,
            b: <Link href="/cultivars" className={link}>{t("footer.cultivars")}</Link>,
            c: <Link href="/research" className={link}>{t("rs.s.crumb")}</Link>,
          })}
        </p>
      </div>
    </main>
  );
}
