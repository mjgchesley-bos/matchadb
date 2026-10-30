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

// Question-style pages ("best matcha for lattes", "matcha under $20") that
// answer a search from live database numbers. Prose here is deliberately free
// of figures -- every count, price and median shown on a page is computed from
// the product table when the site builds (see guide-data.ts), and the FAQ
// answers are functions of that same data so they cannot drift from it.

export type GuideList = {
  heading: string;
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
  faq: { q: string; a: (c: GuideCtx) => string }[];
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
      "Matcha powders that brands sell for lattes, compared by grade, origin and price per gram, from each brand's own product page.",
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
        heading: "Lowest price per gram for lattes",
        note: "At most two products per brand.",
        limit: 6,
        sort: "perGram",
        browse: "use=Lattes",
      },
    ],
    faq: [
      {
        q: "What grade of matcha is best for lattes?",
        a: (c) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const bits =
            cer && cul
              ? ` In this data, ${cer.count} latte-suited powders are labeled ceremonial (median ${usd(cer.median)}/g) and ${cul.count} culinary (median ${usd(cul.median)}/g).`
              : "";
          return `There is no official grade standard, so the labels are each brand's own.${bits} Culinary and "barista" grades cost less per gram and are made for mixing with milk, while ceremonial grade tastes smoother but costs more. Many people use either.`;
        },
      },
      {
        q: "How much matcha goes in a latte?",
        a: (c) =>
          `Recipes commonly use about 2 to 4 grams (roughly 1 to 2 teaspoons) per drink. At the median price of ${usd(c.s.median)} per gram for the powders on this page, that is about ${grams(c, 2)} to ${grams(c, 4)} of matcha per latte.`,
      },
      {
        q: "Is ceremonial matcha worth using in a latte?",
        a: (c) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const ratio = cer?.median && cul?.median ? ` In this data ceremonial costs about ${(cer.median / cul.median).toFixed(1)} times as much per gram as culinary.` : "";
          return `It is a matter of taste and budget. Milk and sweetener mask some of the nuance that makes ceremonial grade expensive, so many people keep it for water-whisked tea.${ratio}`;
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
      "What ceremonial and culinary matcha mean, how they differ in taste and use, and how much each costs per gram across brands.",
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
        a: (c) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const price = cer && cul ? ` In this data the median is ${usd(cer.median)} per gram for ceremonial and ${usd(cul.median)} for culinary.` : "";
          return `Ceremonial is sold for drinking with water and usually tastes smoother and sweeter; culinary is sold for lattes and cooking and tastes stronger and more bitter.${price}`;
        },
      },
      {
        q: "Is the ceremonial grade label regulated?",
        a: () =>
          "To our knowledge, no. The terms are marketing labels set by each brand, which is why this site records the grade as the brand states it and compares price per gram rather than trusting the label alone.",
      },
      {
        q: "Can I use ceremonial matcha for baking?",
        a: (c) => {
          const cer = c.g("Ceremonial");
          const cul = c.g("Culinary");
          const ratio = cer?.median && cul?.median ? ` It costs about ${(cer.median / cul.median).toFixed(1)} times as much per gram in this data.` : "";
          return `You can, but heat and other ingredients mute the delicate flavor that ceremonial grade is priced for, so most bakers use culinary grade.${ratio}`;
        },
      },
      {
        q: "Can I drink culinary matcha with water?",
        a: () =>
          "Yes. Expect a stronger, more bitter taste than a ceremonial grade. Some brands' culinary matcha is pleasant on its own, but it is formulated for mixing.",
      },
    ],
    related: ["matcha-for-lattes", "matcha-for-baking-and-cooking", "usucha-vs-koicha-matcha"],
    browse: "grade=Ceremonial&grade=Culinary",
  },
  {
    slug: "matcha-under-20",
    title: "Best Matcha Under $20: Price per Gram Compared",
    h1: "Best matcha under $20",
    description:
      "Matcha powders priced at $20 or less, compared by size and price per gram, with grade and origin from each brand's own page.",
    intro: [
      "Under $20 buys a 20 to 50 gram tin from many sellers, and the sticker price hides a lot. A $15 tin of 20 grams costs more per gram than a $19 tin of 40 grams, so price per gram is the fair way to compare.",
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
        note: "Lowest price per gram under $20, at most two per brand.",
        limit: 6,
        sort: "perGram",
        browse: "maxPrice=20",
      },
    ],
    faq: [
      {
        q: "Is matcha under $20 any good?",
        a: (c) =>
          `It can be. Among ${c.s.count} powders under $20 here, the median is ${usd(c.s.median)} per gram. Price and quality are related but not tied together, and many cheaper powders are labeled culinary or standard grade. We list what brands state rather than ranking taste.`,
      },
      {
        q: "How much matcha do you get for $20?",
        a: (c) => (c.s.median ? `At the median price per gram on this page, $20 buys about ${(20 / c.s.median).toFixed(0)} grams, and the lowest-priced powders go further.` : "It depends on the brand; compare price per gram."),
      },
      {
        q: "Why do I see 20 gram minimums?",
        a: () =>
          "Sample sizes and tiny sachets make price per gram misleading, so guides only include products sold in packs of at least 20 grams with a verified price.",
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
      "Matcha powders listed as certified organic, compared by brand, grade and price per gram, with organic status taken from each product page.",
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
      { heading: "Lowest price per gram, organic", note: "At most two per brand.", limit: 6, sort: "perGram", browse: "organicOnly=1" },
    ],
    faq: [
      {
        q: "Does organic matcha cost more?",
        a: (c) =>
          c.s.median != null && c.all.median != null
            ? `Here the median organic powder is ${usd(c.s.median)} per gram, against ${usd(c.all.median)} for all matcha powders compared on this site (${c.s.count} organic of ${c.all.count}).`
            : "Compare price per gram on the table above.",
      },
      {
        q: "How do I know a matcha is really organic?",
        a: () =>
          "Look for the certification mark and certifier named on the product page or label. This site records the organic claim as the brand states it and does not verify certificates, so check the brand's page before relying on it.",
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
      "Matcha powders that brands sell for baking and cooking, compared by grade, origin and price per gram.",
    intro: [
      "Baking and cooking put matcha next to sugar, fat and heat. Those mute the subtle sweetness that a ceremonial grade is priced for, which is why recipes usually call for a culinary grade: a stronger flavor at a lower cost per gram, often in larger packs.",
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
      { heading: "Lowest price per gram for cooking", note: "At most two per brand.", limit: 6, sort: "perGram", browse: "use=Culinary" },
    ],
    faq: [
      {
        q: "What kind of matcha is best for baking?",
        a: (c) => {
          const cul = c.g("Culinary");
          const price = cul ? ` Culinary-grade powders here have a median of ${usd(cul.median)} per gram.` : "";
          return `Most recipes use a culinary grade, which is cheaper and holds its flavor against sugar and heat.${price}`;
        },
      },
      {
        q: "Does baking change matcha's color?",
        a: () =>
          "Prolonged heat tends to turn matcha's bright green toward olive and mutes its flavor, which is another reason bakers rely on stronger, cheaper grades and add matcha in generous amounts.",
      },
    ],
    related: ["ceremonial-vs-culinary-matcha", "matcha-for-lattes", "matcha-under-20"],
    browse: "use=Culinary",
  },
  {
    slug: "how-much-does-matcha-cost",
    title: "How Much Does Matcha Cost? Price per Gram by Grade",
    h1: "How much does matcha cost?",
    description:
      "Median price per gram for matcha powder by grade and growing region, calculated from brand product pages across the database.",
    intro: [
      "Matcha prices run from a few cents to many dollars per gram. Tin price alone is misleading because sizes range from 20 grams to a kilo, so the numbers on this page are all price per gram, converted to US dollars.",
      "The range comes mostly from grade, harvest and origin. The tables show the median and the middle half of prices for each, and the lists show examples in each price band.",
    ],
    spec: {},
    tables: ["grade", "region"],
    lists: [
      {
        heading: `Budget: up to ${usd(PRICE_TIER_CHEAP_MAX)} per gram`,
        limit: 6,
        spec: { maxPerGram: PRICE_TIER_CHEAP_MAX },
      },
      {
        heading: `Mid-range: ${usd(PRICE_TIER_CHEAP_MAX)} to ${usd(PRICE_TIER_MID_MAX)} per gram`,
        limit: 6,
        spec: { minPerGram: PRICE_TIER_CHEAP_MAX, maxPerGram: PRICE_TIER_MID_MAX },
      },
      {
        heading: `Premium: over ${usd(PRICE_TIER_MID_MAX)} per gram`,
        limit: 6,
        spec: { minPerGram: PRICE_TIER_MID_MAX },
      },
    ],
    method:
      "Price bands follow the site's price tiers, set at roughly the one-third and two-thirds points of price per gram across the catalog.",
    faq: [
      {
        q: "How much does matcha cost per gram?",
        a: (c) =>
          c.s.median != null && c.s.p25 != null && c.s.p75 != null
            ? `Across ${c.s.count} matcha powders from ${c.s.brands} brands, the median is ${usd(c.s.median)} per gram, and the middle half of products fall between ${usd(c.s.p25)} and ${usd(c.s.p75)}.`
            : "See the table above.",
      },
      {
        q: "How much should a tin of matcha cost?",
        a: (c) =>
          c.s.median != null
            ? `At the median price per gram, a 30 gram tin is about ${grams(c, 30)} and a 100 gram bag about ${grams(c, 100)}. Ceremonial grades cost more and culinary grades less.`
            : "It depends on grade and size.",
      },
      {
        q: "Why is matcha expensive?",
        a: () =>
          "Matcha comes from tea plants shaded before harvest, picked young, steamed, dried, de-stemmed and ground slowly in stone mills, so it is more labor-intensive than ordinary tea, and higher grades are made from the best leaves. Prices here are what each brand charges, not a verdict on value.",
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
      "How usucha (thin) and koicha (thick) matcha differ in preparation, taste and price per gram, from brands that label matcha by preparation.",
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
        a: (c) => {
          const u = c.g("Usucha");
          const k = c.g("Koicha");
          const price = u && k ? ` In this data usucha-labeled matcha has a median of ${usd(u.median)} per gram and koicha ${usd(k.median)}.` : "";
          return `Usucha is thin whisked tea; koicha is thick tea made with about twice the powder in much less water.${price}`;
        },
      },
      {
        q: "Can I make usucha with koicha matcha?",
        a: () =>
          "Yes. Koicha-labeled matcha is sweeter and gentler, so it works thin too; it just costs more per bowl.",
      },
      {
        q: "Can I make koicha with usucha matcha?",
        a: () =>
          "You can, but more bitterness and astringency come through when the tea is thick, which is why matcha is labeled koicha in the first place.",
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
