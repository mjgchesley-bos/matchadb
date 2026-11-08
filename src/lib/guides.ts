import { PRICE_TIER_CHEAP_MAX, PRICE_TIER_MID_MAX } from "./price";
import {
  getGuideRows,
  groupBy,
  pickProducts,
  summarize,
  type Group,
  type GuideSpec,
  type Summary,
} from "./guide-data";
import type { ProductRow } from "./db";
import { usd30 } from "./unit-price";
import type { CFn } from "@/i18n/content";

// Question-style pages ("best matcha for lattes", "matcha under $20") that
// answer a search from live database numbers. Prose here is deliberately free
// of figures -- every count, price and median shown on a page is computed from
// the product table when the site builds (see guide-data.ts), and the FAQ
// answers are functions of that same data so they cannot drift from it.
//
// Translations: the English text lives here. Each translatable string has an id
// (gd.<slug>.…) that the translation files in src/i18n/content use; the answers
// take a `k(id, english, vars)` function and fill in the numbers themselves.

export type GuideList = {
  heading: string;
  // Values to fill into a translated heading ({max}, {min}).
  headingVars?: Record<string, string | number>;
  note?: string;
  // Defaults to the guide's own spec.
  spec?: GuideSpec;
  limit: number;
  sort?: "recognition" | "perGram";
  // Query string for the matching filters on /browse (the full database).
  browse?: string;
};

export type GuideCtx = {
  s: Summary;
  all: Summary;
  grade: Group[];
  region: Group[];
  g: (name: string) => Group | undefined;
};

export type Guide = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string[];
  spec: GuideSpec;
  tables: ("grade" | "region")[];
  lists: GuideList[];
  method?: string;
  faq: { q: string; a: (c: GuideCtx, k: CFn) => string }[];
  related: string[];
  browse: string;
};

const usd = (n: number | null | undefined) => (n == null ? "n/a" : `$${n.toFixed(2)}`);
const grams = (c: GuideCtx, g: number) => (c.s.median == null ? "n/a" : usd(c.s.median * g));

export const GUIDES: Guide[] = [
  {
    slug: "matcha-for-lattes",
    title: "Best Matcha for Lattes: Compared by Price and Grade",
    h1: "Best matcha for lattes",
    description:
      "Matcha powders that brands sell for lattes, compared by grade, origin and price per 30 g, from each brand's own product page.",
    intro: [
      "A latte sets matcha behind milk and usually a sweetener, and you use more powder per drink than for a whisked bowl. That makes two things matter: whether the flavor holds up once it is diluted, and what each gram costs.",
      "Brands tag products for lattes in different ways. Some sell a dedicated latte or barista grade, some recommend their culinary grade, and some say their ceremonial matcha works too. This page lists plain matcha powders whose own product page mentions lattes, iced drinks or smoothies, with the grade each brand states. Ready-made latte mixes are left out, and so is matcha sold as koicha or usucha, which is meant for traditional preparation.",
    ],
    spec: { uses: ["Lattes"], excludeGrades: ["Koicha", "Usucha"] },
    tables: ["grade"],
    lists: [
      {
        heading: "Well-known brands with latte-suited matcha",
        note: "One product per brand first, in order of brand recognition, so the list is not one brand's whole catalog.",
        limit: 12,
        browse: "use=Lattes",
      },
      {
        heading: "Lowest price per 30 g for lattes",
        note: "At most two products per brand.",
        limit: 6,
        sort: "perGram",
        browse: "use=Lattes",
      },
    ],
    faq: [
      {
        q: "What grade of matcha is best for lattes?",
        a: (c, k) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const bits =
            cer && cul
              ? k("gd.matcha-for-lattes.faq.0.bits", " In this data, {cn} latte-suited powders are labeled ceremonial (median {cm} per 30 g) and {un} culinary (median {um} per 30 g).", {
                  cn: cer.count,
                  cm: usd30(cer.median),
                  un: cul.count,
                  um: usd30(cul.median),
                })
              : "";
          return k(
            "gd.matcha-for-lattes.faq.0.a",
            `There is no official grade standard, so the labels are each brand's own.{bits} Culinary and "barista" grades cost less per 30 g and are made for mixing with milk, while ceremonial grade tastes smoother but costs more. Many people use either.`,
            { bits }
          );
        },
      },
      {
        q: "How much matcha goes in a latte?",
        a: (c, k) =>
          k(
            "gd.matcha-for-lattes.faq.1.a",
            "Recipes commonly use about 2 to 4 grams (roughly 1 to 2 teaspoons) per drink. At the median price of {median} per 30 g for the powders on this page, that is about {lo} to {hi} of matcha per latte.",
            { median: usd30(c.s.median), lo: grams(c, 2), hi: grams(c, 4) }
          ),
      },
      {
        q: "Is ceremonial matcha worth using in a latte?",
        a: (c, k) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const ratio =
            cer?.median && cul?.median
              ? k("gd.matcha-for-lattes.faq.2.ratio", " In this data ceremonial costs about {x} times as much per 30 g as culinary.", { x: (cer.median / cul.median).toFixed(1) })
              : "";
          return k(
            "gd.matcha-for-lattes.faq.2.a",
            "It is a matter of taste and budget. Milk and sweetener mask some of the nuance that makes ceremonial grade expensive, so many people keep it for water-whisked tea.{ratio}",
            { ratio }
          );
        },
      },
    ],
    related: ["ceremonial-vs-culinary-matcha", "matcha-under-20", "how-much-does-matcha-cost"],
    browse: "use=Lattes",
  },
  {
    slug: "ceremonial-vs-culinary-matcha",
    title: "Ceremonial vs Culinary Matcha: Differences and Price",
    h1: "Ceremonial vs culinary matcha",
    description:
      "What ceremonial and culinary matcha mean, how they differ in taste and use, and how much each costs per 30 g across brands.",
    intro: [
      "Ceremonial and culinary are the two grade labels you see most. Ceremonial is sold for drinking whisked with water; culinary is sold for lattes, smoothies and baking. Brands apply these labels themselves. To our knowledge there is no legal or industry standard behind them, so the same word can mean different quality at different sellers.",
      "What typically differs: ceremonial matcha is usually made from the youngest shade-grown leaves and tends to taste sweeter and smoother, while culinary matcha is often made from later harvests and has a stronger, more bitter edge that stands up to milk and sugar. The table shows what that difference costs.",
    ],
    spec: { grades: ["Ceremonial", "Culinary"] },
    tables: ["grade"],
    lists: [
      { heading: "Ceremonial matcha from well-known brands", limit: 6, spec: { grades: ["Ceremonial"] }, browse: "grade=Ceremonial" },
      { heading: "Culinary matcha from well-known brands", limit: 6, spec: { grades: ["Culinary"] }, browse: "grade=Culinary" },
    ],
    faq: [
      {
        q: "What is the difference between ceremonial and culinary matcha?",
        a: (c, k) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const price =
            cer && cul
              ? k("gd.ceremonial-vs-culinary-matcha.faq.0.price", " In this data the median is {cm} per 30 g for ceremonial and {um} for culinary.", { cm: usd30(cer.median), um: usd30(cul.median) })
              : "";
          return k(
            "gd.ceremonial-vs-culinary-matcha.faq.0.a",
            "Ceremonial is sold for drinking with water and usually tastes smoother and sweeter; culinary is sold for lattes and cooking and tastes stronger and more bitter.{price}",
            { price }
          );
        },
      },
      {
        q: "Is the ceremonial grade label regulated?",
        a: (_c, k) =>
          k(
            "gd.ceremonial-vs-culinary-matcha.faq.1.a",
            "To our knowledge, no. The terms are marketing labels set by each brand, which is why this site records the grade as the brand states it and compares price per 30 g rather than trusting the label alone."
          ),
      },
      {
        q: "Can I use ceremonial matcha for baking?",
        a: (c, k) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const ratio =
            cer?.median && cul?.median
              ? k("gd.ceremonial-vs-culinary-matcha.faq.2.ratio", " It costs about {x} times as much per 30 g in this data.", { x: (cer.median / cul.median).toFixed(1) })
              : "";
          return k(
            "gd.ceremonial-vs-culinary-matcha.faq.2.a",
            "You can, but heat and other ingredients mute the delicate flavor that ceremonial grade is priced for, so most bakers use culinary grade.{ratio}",
            { ratio }
          );
        },
      },
      {
        q: "Can I drink culinary matcha with water?",
        a: (_c, k) =>
          k(
            "gd.ceremonial-vs-culinary-matcha.faq.3.a",
            "Yes. Expect a stronger, more bitter taste than a ceremonial grade. Some brands' culinary matcha is pleasant on its own, but it is formulated for mixing."
          ),
      },
    ],
    related: ["matcha-for-lattes", "matcha-for-baking-and-cooking", "usucha-vs-koicha-matcha"],
    browse: "grade=Ceremonial&grade=Culinary",
  },
  {
    slug: "matcha-under-20",
    title: "Best Matcha Under $20: Price per 30 g Compared",
    h1: "Best matcha under $20",
    description:
      "Matcha powders priced at $20 or less, compared by size and price per 30 g, with grade and origin from each brand's own page.",
    intro: [
      "Under $20 buys a 20 to 50 gram tin from many sellers, and the sticker price hides a lot. A $15 tin of 20 grams costs more per gram than a $19 tin of 40 grams, so the fair way to compare is the price of the same standard 30 g amount.",
      "Everything here is a plain matcha powder priced at $20 or less with a pack of 20 grams or more. Cheaper powders are more often culinary or standard grades, which suit lattes and baking; if you want to drink it with water, look for a ceremonial label and a named origin.",
    ],
    spec: { maxPrice: 20 },
    tables: ["grade"],
    lists: [
      {
        heading: "Well-known brands with matcha under $20",
        note: "One product per brand first, in order of brand recognition.",
        limit: 12,
        browse: "maxPrice=20",
      },
      {
        heading: "Most grams for the money",
        note: "Lowest price per 30 g under $20, at most two per brand.",
        limit: 6,
        sort: "perGram",
        browse: "maxPrice=20",
      },
    ],
    faq: [
      {
        q: "Is matcha under $20 any good?",
        a: (c, k) =>
          k(
            "gd.matcha-under-20.faq.0.a",
            "It can be. Among {n} powders under $20 here, the median is {median} per 30 g. Price and quality are related but not tied together, and many cheaper powders are labeled culinary or standard grade. We list what brands state rather than ranking taste.",
            { n: c.s.count, median: usd30(c.s.median) }
          ),
      },
      {
        q: "How much matcha do you get for $20?",
        a: (c, k) =>
          c.s.median
            ? k("gd.matcha-under-20.faq.1.a", "At the median price per 30 g on this page, $20 buys about {g} grams, and the lowest-priced powders go further.", { g: (20 / c.s.median).toFixed(0) })
            : k("gd.matcha-under-20.faq.1.none", "It depends on the brand; compare price per 30 g."),
      },
      {
        q: "Why do I see 20 gram minimums?",
        a: (_c, k) =>
          k(
            "gd.matcha-under-20.faq.2.a",
            "Sample sizes and tiny sachets make a standard-size price misleading, so guides only include products sold in packs of at least 20 grams with a verified price."
          ),
      },
    ],
    related: ["how-much-does-matcha-cost", "matcha-for-lattes", "organic-matcha"],
    browse: "maxPrice=20",
  },
  {
    slug: "organic-matcha",
    title: "Organic Matcha: Brands and Prices Compared",
    h1: "Organic matcha",
    description:
      "Matcha powders listed as certified organic, compared by brand, grade and price per 30 g, with organic status taken from each product page.",
    intro: [
      "Organic matcha is matcha the seller lists as certified organic, most often under a USDA or Japanese JAS organic scheme. This page lists plain matcha powders whose own product page says so. We record that statement; we have not checked certificates.",
      "Certified organic describes how the tea was grown and processed, not how it tastes or whether a particular batch has been tested for contaminants. For what published research says on that topic, see the research library's safety and contaminants page.",
    ],
    spec: { organicOnly: true },
    tables: ["grade"],
    lists: [
      {
        heading: "Well-known brands with organic matcha",
        note: "One product per brand first, in order of brand recognition.",
        limit: 12,
        browse: "organicOnly=1",
      },
      { heading: "Lowest price per 30 g, organic", note: "At most two per brand.", limit: 6, sort: "perGram", browse: "organicOnly=1" },
    ],
    faq: [
      {
        q: "Does organic matcha cost more?",
        a: (c, k) =>
          c.s.median != null && c.all.median != null
            ? k(
                "gd.organic-matcha.faq.0.a",
                "Here the median organic powder is {median} per 30 g, against {all} for all matcha powders compared on this site ({n} organic of {total}).",
                { median: usd30(c.s.median), all: usd30(c.all.median), n: c.s.count, total: c.all.count }
              )
            : k("gd.organic-matcha.faq.0.none", "Compare price per 30 g on the table above."),
      },
      {
        q: "How do I know a matcha is really organic?",
        a: (_c, k) =>
          k(
            "gd.organic-matcha.faq.1.a",
            "Look for the certification mark and certifier named on the product page or label. This site records the organic claim as the brand states it and does not verify certificates, so check the brand's page before relying on it."
          ),
      },
    ],
    related: ["matcha-under-20", "how-much-does-matcha-cost", "matcha-for-lattes"],
    browse: "organicOnly=1",
  },
  {
    slug: "matcha-for-baking-and-cooking",
    title: "Best Matcha for Baking and Cooking: Compared by Price",
    h1: "Best matcha for baking and cooking",
    description:
      "Matcha powders that brands sell for baking and cooking, compared by grade, origin and price per 30 g.",
    intro: [
      "Baking and cooking put matcha next to sugar, fat and heat. Those mute the subtle sweetness that a ceremonial grade is priced for, which is why recipes usually call for a culinary grade: a stronger flavor at a lower cost per 30 g, often in larger packs.",
      "This page lists plain matcha powders whose own product page mentions culinary use, baking, cooking or recipes, with the grade each brand states. Flavored blends, ready-made mixes and matcha sold as koicha or usucha are left out.",
    ],
    spec: { uses: ["Culinary"], excludeGrades: ["Koicha", "Usucha"] },
    tables: ["grade"],
    lists: [
      {
        heading: "Well-known brands with culinary matcha",
        note: "One product per brand first, in order of brand recognition.",
        limit: 12,
        browse: "use=Culinary",
      },
      { heading: "Lowest price per 30 g for cooking", note: "At most two per brand.", limit: 6, sort: "perGram", browse: "use=Culinary" },
    ],
    faq: [
      {
        q: "What kind of matcha is best for baking?",
        a: (c, k) => {
          const cul = c.g("Culinary");
          const price = cul ? k("gd.matcha-for-baking-and-cooking.faq.0.price", " Culinary-grade powders here have a median of {median} per 30 g.", { median: usd30(cul.median) }) : "";
          return k(
            "gd.matcha-for-baking-and-cooking.faq.0.a",
            "Most recipes use a culinary grade, which is cheaper and holds its flavor against sugar and heat.{price}",
            { price }
          );
        },
      },
      {
        q: "Does baking change matcha's color?",
        a: (_c, k) =>
          k(
            "gd.matcha-for-baking-and-cooking.faq.1.a",
            "Prolonged heat tends to turn matcha's bright green toward olive and mutes its flavor, which is another reason bakers rely on stronger, cheaper grades and add matcha in generous amounts."
          ),
      },
    ],
    related: ["ceremonial-vs-culinary-matcha", "matcha-for-lattes", "matcha-under-20"],
    browse: "use=Culinary",
  },
  {
    slug: "how-much-does-matcha-cost",
    title: "How Much Does Matcha Cost? Price per 30 g by Grade",
    h1: "How much does matcha cost?",
    description:
      "Median price per 30 g for matcha powder by grade and growing region, calculated from brand product pages across the database.",
    intro: [
      "Matcha prices vary enormously: the cost of a standard 30 g amount runs from a few dollars to well over a hundred. Tin price alone is misleading because sizes range from 20 grams to a kilo, so the numbers on this page are all the price per 30 g, converted to US dollars and calculated only from sizes the seller states.",
      "The range comes mostly from grade, harvest and origin. The tables show the median and the middle half of prices for each, and the lists show examples in each price band.",
    ],
    spec: {},
    tables: ["grade", "region"],
    lists: [
      {
        heading: `Budget: up to ${usd30(PRICE_TIER_CHEAP_MAX)} per 30 g`,
        headingVars: { max: usd30(PRICE_TIER_CHEAP_MAX) },
        limit: 6,
        spec: { maxPerGram: PRICE_TIER_CHEAP_MAX },
      },
      {
        heading: `Mid-range: ${usd30(PRICE_TIER_CHEAP_MAX)} to ${usd30(PRICE_TIER_MID_MAX)} per 30 g`,
        headingVars: { min: usd30(PRICE_TIER_CHEAP_MAX), max: usd30(PRICE_TIER_MID_MAX) },
        limit: 6,
        spec: { minPerGram: PRICE_TIER_CHEAP_MAX, maxPerGram: PRICE_TIER_MID_MAX },
      },
      {
        heading: `Premium: over ${usd30(PRICE_TIER_MID_MAX)} per 30 g`,
        headingVars: { min: usd30(PRICE_TIER_MID_MAX) },
        limit: 6,
        spec: { minPerGram: PRICE_TIER_MID_MAX },
      },
    ],
    method:
      "Price bands follow the site's price tiers, set at roughly the one-third and two-thirds points of price per 30 g across the catalog.",
    faq: [
      {
        q: "How much does a 30 g tin of matcha cost?",
        a: (c, k) =>
          c.s.median != null && c.s.p25 != null && c.s.p75 != null
            ? k(
                "gd.how-much-does-matcha-cost.faq.0.a",
                "Across {n} matcha powders from {b} brands, the median is {median} per 30 g, and the middle half of products fall between {lo} and {hi}.",
                { n: c.s.count, b: c.s.brands, median: usd30(c.s.median), lo: usd30(c.s.p25), hi: usd30(c.s.p75) }
              )
            : k("gd.how-much-does-matcha-cost.faq.0.none", "See the table above."),
      },
      {
        q: "How much should a tin of matcha cost?",
        a: (c, k) =>
          c.s.median != null
            ? k(
                "gd.how-much-does-matcha-cost.faq.1.a",
                "At the median price, a 30 gram tin is about {t30} and a 100 gram bag about {t100}. Ceremonial grades cost more and culinary grades less.",
                { t30: grams(c, 30), t100: grams(c, 100) }
              )
            : k("gd.how-much-does-matcha-cost.faq.1.none", "It depends on grade and size."),
      },
      {
        q: "Why is matcha expensive?",
        a: (_c, k) =>
          k(
            "gd.how-much-does-matcha-cost.faq.2.a",
            "Matcha comes from tea plants shaded before harvest, picked young, steamed, dried, de-stemmed and ground slowly in stone mills, so it is more labor-intensive than ordinary tea, and higher grades are made from the best leaves. Prices here are what each brand charges, not a verdict on value."
          ),
      },
    ],
    related: ["matcha-under-20", "ceremonial-vs-culinary-matcha", "organic-matcha"],
    browse: "",
  },
  {
    slug: "usucha-vs-koicha-matcha",
    title: "Usucha vs Koicha Matcha: What's the Difference?",
    h1: "Usucha vs koicha matcha",
    description:
      "How usucha (thin) and koicha (thick) matcha differ in preparation, taste and price per 30 g, from brands that label matcha by preparation.",
    intro: [
      "Usucha and koicha are two ways of preparing matcha in the tea ceremony. Usucha, or thin tea, is whisked with more water into a frothy bowl. Koicha, or thick tea, uses roughly twice the powder in far less water and is stirred, not whisked, into a thick, syrupy tea.",
      "Some Japanese sellers label matcha by the preparation it is meant for. Koicha-labeled matcha is often made from finer leaves and tastes sweeter and less astringent, because thick tea has nowhere to hide bitterness. That quality shows up in the price.",
    ],
    spec: { grades: ["Usucha", "Koicha"] },
    tables: ["grade"],
    lists: [
      { heading: "Usucha matcha", limit: 6, spec: { grades: ["Usucha"] }, browse: "grade=Usucha" },
      { heading: "Koicha matcha", limit: 6, spec: { grades: ["Koicha"] }, browse: "grade=Koicha" },
    ],
    faq: [
      {
        q: "What is the difference between usucha and koicha?",
        a: (c, k) => {
          const u = c.g("Usucha");
          const kc = c.g("Koicha");
          const price =
            u && kc
              ? k("gd.usucha-vs-koicha-matcha.faq.0.price", " In this data usucha-labeled matcha has a median of {um} per 30 g and koicha {km}.", { um: usd30(u.median), km: usd30(kc.median) })
              : "";
          return k(
            "gd.usucha-vs-koicha-matcha.faq.0.a",
            "Usucha is thin whisked tea; koicha is thick tea made with about twice the powder in much less water.{price}",
            { price }
          );
        },
      },
      {
        q: "Can I make usucha with koicha matcha?",
        a: (_c, k) =>
          k("gd.usucha-vs-koicha-matcha.faq.1.a", "Yes. Koicha-labeled matcha is sweeter and gentler, so it works thin too; it just costs more per bowl."),
      },
      {
        q: "Can I make koicha with usucha matcha?",
        a: (_c, k) =>
          k(
            "gd.usucha-vs-koicha-matcha.faq.2.a",
            "You can, but more bitterness and astringency come through when the tea is thick, which is why matcha is labeled koicha in the first place."
          ),
      },
    ],
    related: ["ceremonial-vs-culinary-matcha", "how-much-does-matcha-cost", "matcha-under-20"],
    browse: "grade=Usucha&grade=Koicha",
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export type LoadedGuide = {
  guide: Guide;
  ctx: GuideCtx;
  lists: (GuideList & { products: ProductRow[]; total: number })[];
};

// Reads everything a guide page shows. `all` (every plain matcha powder) is
// the reference for "against all matcha" comparisons.
export async function loadGuide(guide: Guide): Promise<LoadedGuide> {
  const [rows, allRows] = await Promise.all([getGuideRows(guide.spec), getGuideRows({})]);
  const grade = groupBy(rows, "grade");
  const region = groupBy(rows, "region");
  const lists = await Promise.all(
    guide.lists.map(async (l) => {
      const listRows = l.spec ? await getGuideRows(l.spec) : rows;
      return { ...l, products: pickProducts(listRows, l.limit, l.sort), total: listRows.length };
    })
  );
  const ctx: GuideCtx = {
    s: summarize(rows),
    all: summarize(allRows),
    grade,
    region,
    g: (name) => grade.find((x) => x.name === name),
  };
  return { guide, ctx, lists };
}
