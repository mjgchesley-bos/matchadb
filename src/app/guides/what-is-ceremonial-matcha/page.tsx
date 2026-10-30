import type { Metadata } from "next";
import Link from "next/link";
import { getGuideRows, groupBy, summarize } from "@/lib/guide-data";
import { getDb } from "@/lib/db";
import { usd } from "@/components/GuideBlocks";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

const url = `${SITE_URL}/guides/what-is-ceremonial-matcha`;
const title = "What Is Ceremonial Matcha? Origin and Meaning";
const description =
  "Where the term \"ceremonial grade\" matcha came from, how it relates to the Japanese tea ceremony, what it does and does not guarantee today, and what our price data shows.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url },
};

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

export default async function WhatIsCeremonialPage() {
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

  const faq: { q: string; a: string }[] = [
    {
      q: "Is ceremonial grade matcha used in the Japanese tea ceremony?",
      a: "Not necessarily. Japanese tea houses sell matcha in lines made for koicha (thick tea) and usucha (thin tea), often under traditional names, which is the closer equivalent in Japan. \"Ceremonial grade\" on an export product is an English label with no fixed link to any of them.",
    },
    {
      q: "Who decides what counts as ceremonial grade?",
      a: "Each brand decides. To our knowledge there is no Japanese or international standard that defines the term, and nobody audits it. Several tea sellers say the same in their own explanations of the label.",
    },
    {
      q: "Is ceremonial matcha always the highest quality?",
      a: `No. The label sets no floor and no ceiling. In our data, powders labeled ceremonial run from ${usd(cer.min)} to ${usd(cer.max)} per gram, with the middle half between ${usd(cer.p25)} and ${usd(cer.p75)}.`,
    },
    {
      q: "Can I use ceremonial matcha for lattes or baking?",
      a: "Yes, nothing stops you, but milk, sugar and heat hide much of what a ceremonial grade is priced for. Our ceremonial vs culinary guide compares the two on price and use.",
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
              headline: "What is ceremonial matcha?",
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
                { "@type": "ListItem", position: 1, name: "Guides", item: `${SITE_URL}/guides` },
                { "@type": "ListItem", position: 2, name: "What is ceremonial matcha?", item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint mb-6">
        <Link href="/guides" className="hover:text-ink">Guides</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">What is ceremonial matcha?</span>
      </nav>

      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Explainer</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">What is ceremonial matcha?</h1>
      </header>

      <section className="mt-6 max-w-3xl border border-line rounded-sm bg-paper-raised px-5 py-4" aria-label="Short answer">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">The short answer</h2>
        <p className="text-lg text-ink leading-relaxed">
          &ldquo;Ceremonial grade&rdquo; is an English-language label for matcha made to be whisked with water and drunk on its own. It is not a Japanese grade, and no government or industry
          body defines it. The tea ceremony it borrows its name from is real and centuries old. The label is a much later shorthand from the export trade, and it means whatever the seller
          means by it.
        </p>
      </section>

      <div className="mt-10 max-w-3xl flex flex-col gap-10 text-ink-muted leading-relaxed">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">The ceremony behind the word</h2>
          <p className="mt-3">
            The word &ldquo;ceremonial&rdquo; points to the Japanese tea ceremony, known as <em>chanoyu</em> or <em>sadō</em>, in which a host prepares and serves matcha to guests. Matcha and the
            ceremony grew up together, over about four centuries:
          </p>
          <ol className="mt-5 flex flex-col gap-4 border-l-2 border-line pl-5">
            {TIMELINE.map((t) => (
              <li key={t.when}>
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-forest">{t.when}</p>
                <p className="mt-1">{t.what}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">What the Japanese trade actually calls things</h2>
          <p className="mt-3">
            Japanese tea houses do not sort matcha into &ldquo;ceremonial&rdquo; and &ldquo;culinary.&rdquo; Their vocabulary is more specific. The raw material is <em>tencha</em>, the shaded
            leaf before it is milled. Within the tea ceremony there are two preparations, <em>koicha</em> (thick tea, a small amount of powder in little water) and <em>usucha</em> (thin tea,
            whisked into a froth), and many houses make separate lines for each. Lines carry traditional names rather than grades. Names ending in <em>-mukashi</em>{" "}
            (&ldquo;old days&rdquo;) are the classic pattern, going back at least to Baba Mukashi, the oldest known matcha brand name.
          </p>
          <p className="mt-3">
            The pattern is alive in the database: {muk.n} products from {muk.b} brands carry a <em>mukashi</em> name. Brands in the database also label {koi.count} plain powders as
            koicha and {usu.count}{" "}
            as usucha. Those words describe how the tea is meant to be prepared rather than ranking it the way &ldquo;ceremonial grade&rdquo; sounds like it does.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">How &ldquo;ceremonial grade&rdquo; appeared</h2>
          <p className="mt-3">
            As matcha began to sell abroad, sellers needed a quick way to tell a buyer which powder to whisk with water and which to put in a latte or a cake. English supplied two words:
            &ldquo;ceremonial&rdquo; for the first and &ldquo;culinary&rdquo; for the second. One Japanese tea supplier describes the translation this way: lines meant for koicha and usucha became
            &ldquo;ceremonial,&rdquo; and everything else became &ldquo;culinary.&rdquo;
          </p>
          <p className="mt-3">
            We could not find a documented first use of the phrase or a single company that coined it, so we do not claim one. What sellers across the trade agree on, including some who use the
            label themselves, is that it was never a Japanese classification and has no legal definition. Matcha as a product is defined in standards and in Japanese food-labeling
            guidance; to our knowledge none of them defines a ceremonial tier.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">What it means today</h2>
          <ul className="mt-3 flex flex-col gap-3 list-disc pl-5">
            <li>
              <strong className="text-ink">A statement of intended use.</strong> A brand calling a powder ceremonial is saying it should taste good whisked with water alone, without milk or
              sweetener to cover it.
            </li>
            <li>
              <strong className="text-ink">A price signal, not a quality guarantee.</strong> Ceremonial powders cost more than culinary ones on average, but the label alone does not tell you
              how much more or whether it is worth it.
            </li>
            <li>
              <strong className="text-ink">Self-assigned.</strong> There is no testing body, no certificate and no penalty for using the word loosely. Two brands can use it for very different matcha.
            </li>
            <li>
              <strong className="text-ink">A starting point for questions.</strong> The details that do say something are cultivar, harvest, growing region, shading, milling and the producer.
              A brand that gives them is giving you more than the label can.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">What our data shows</h2>
          <p className="mt-3">
            We compare plain matcha powders with a verified price and a pack of at least 20 grams. Of {rows.length.toLocaleString()} such powders, {cer.count.toLocaleString()} ({share}%) are
            labeled ceremonial by their brands.
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [usd(cer.median), "median per gram, ceremonial"],
              [culinary ? usd(culinary.median) : "n/a", "median per gram, culinary"],
              [cer.p25 != null && cer.p75 != null ? `${usd(cer.p25)}–${usd(cer.p75)}` : "n/a", "middle half, ceremonial"],
              [cer.min != null && cer.max != null ? `${usd(cer.min)}–${usd(cer.max)}` : "n/a", "full range, ceremonial"],
            ].map(([v, l]) => (
              <div key={l} className="border border-line rounded-sm bg-paper-raised px-4 py-3">
                <p className="font-display text-xl text-ink tabular-nums">{v}</p>
                <p className="text-xs text-ink-faint uppercase tracking-wide mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-5">
            The spread is the point. Across all matcha powders in the database the median is {usd(all.median)} per gram, and the ceremonial label covers everything from the cheapest to the
            most expensive tins. On the brands&apos; own pages, {withRegion}% of ceremonial powders name a growing region and {withCultivar}% name a cultivar, so the label is the least
            informative thing about them. That is why we compare those details instead.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Reading the label sensibly</h2>
          <ul className="mt-3 flex flex-col gap-2 list-disc pl-5">
            <li>Treat &ldquo;ceremonial&rdquo; as the brand telling you what the powder is for, and look for the facts behind it.</li>
            <li>Check whether the brand names a region and cultivar, and when it was harvested.</li>
            <li>Compare price per gram, not tin price. Our <Link href="/guides/how-much-does-matcha-cost" className="text-matcha hover:text-forest">cost guide</Link> shows typical ranges.</li>
            <li>If you want the traditional framing, look for koicha and usucha lines from Japanese tea houses; see <Link href="/guides/usucha-vs-koicha-matcha" className="text-matcha hover:text-forest">usucha vs koicha</Link>.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Common questions</h2>
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
          <h2 id="ceremonial-sources" className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Sources and notes</h2>
          <p className="text-sm">
            The history summarizes published accounts, mainly the cited history on Wikipedia, and dates for shading and the Edo-period monopoly come from those. Details differ between sources, so
            we state dates conservatively. The comments on the label come from tea sellers&apos; own explanations, and several of them sell matcha, which is worth keeping in mind. The numbers
            above come from the MatchaDB product table and refresh whenever the site is rebuilt.
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
          Related:{" "}
          <Link href="/guides/ceremonial-vs-culinary-matcha" className="text-matcha hover:text-forest">ceremonial vs culinary matcha</Link>,{" "}
          <Link href="/cultivars" className="text-matcha hover:text-forest">cultivars</Link>,{" "}
          <Link href="/research" className="text-matcha hover:text-forest">the research library</Link>.
        </p>
      </div>
    </main>
  );
}
