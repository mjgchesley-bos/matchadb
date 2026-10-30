import { getGuideRows, groupBy, pickProducts, summarize, type Group, type Summary } from "./guide-data";
import { queryStudies } from "./studies";
import type { ProductRow } from "./db";

// One page per tea cultivar that brands name often enough for the numbers to
// mean something. Two kinds of text live here, kept apart on the page:
//  - background facts (origin, year, traits), each written conservatively and
//    sourced; where sellers' descriptions disagree or little is published, the
//    copy says less rather than more;
//  - everything numeric (counts, prices, regions, grades, flavor notes), which
//    is computed from the product table at build time in loadCultivar().
//
// A product's cultivar is the first one the extractor found on the brand's page,
// so a blend of two cultivars is counted once, under one of them.

export type Cultivar = {
  slug: string;
  // The value stored in the products table.
  name: string;
  title: string;
  h1: string;
  description: string;
  intro: string[];
  profile: [string, string][];
  sources: { label: string; url: string }[];
  related: string[];
};

export const CULTIVARS: Cultivar[] = [
  {
    slug: "yabukita",
    name: "Yabukita",
    title: "Yabukita Matcha: Japan's Most Common Tea Cultivar",
    h1: "Yabukita matcha",
    description: "What the Yabukita tea cultivar is, how it is described, and how matcha made from it compares on price, grade and growing region across brands.",
    intro: [
      "Yabukita is the most widely planted tea cultivar in Japan. It was selected in 1908 by Hikosaburo Sugiyama in Shizuoka and registered in 1953, and it still accounts for the largest share of the country's tea fields: roughly 60 to 75 percent, depending on the year and the source.",
      "Most Yabukita goes into everyday sencha, but it is also used for matcha. It is generally described as fresh, lightly grassy and mildly sweet with a gentle astringency, and as hardy and adaptable, which helps explain why it is so common.",
    ],
    profile: [
      ["Selected", "1908, Shizuoka, by Hikosaburo Sugiyama"],
      ["Registered", "1953"],
      ["Share of Japan's tea fields", "Roughly 60 to 75 percent, depending on year and source"],
      ["Typical description", "Fresh, lightly grassy, mildly sweet, gentle astringency"],
    ],
    sources: [
      { label: "Oregon State Univ. Small Farms: the farmer-breeder behind Yabukita", url: "https://smallfarms.oregonstate.edu/smallfarms/farmer-breeder-who-shaped-flavor-japanese-tea-hikosaburo-sugiyama" },
      { label: "Tealife Japanese Tea Pedia: Yabukita", url: "https://japanesetea.sg/japanese-tea-pedia/cultivars/Yabukita/" },
    ],
    related: ["okumidori", "saemidori", "samidori"],
  },
  {
    slug: "okumidori",
    name: "Okumidori",
    title: "Okumidori Matcha: Cultivar Profile, Price and Origins",
    h1: "Okumidori matcha",
    description: "What the Okumidori tea cultivar is, how it is described, and how matcha made from it compares on price, grade and growing region across brands.",
    intro: [
      "Okumidori is a late-budding cultivar widely used for matcha and gyokuro. \"Late-budding\" means its spring shoots open later than Yabukita's, so it is harvested later in the season.",
      "Producers and sellers commonly describe it as umami-forward, with a deep green color and little bitterness, and say it takes shading well. Treat these as descriptions rather than measurements: how a matcha tastes depends as much on shading, harvest and milling as on the cultivar.",
    ],
    profile: [
      ["Budding", "Late, after Yabukita"],
      ["Common uses", "Matcha (tencha) and gyokuro"],
      ["Typical description", "Umami-forward, deep green color, low bitterness"],
    ],
    sources: [
      { label: "Unearthed Gallery: Okumidori matcha", url: "https://unearthed-gallery.com/blogs/founders-blog/okumidori-matcha" },
      { label: "Premium Health Japan: guide to matcha cultivars", url: "https://ujimatchatea.com/blogs/news/matcha-cultivars-guide" },
    ],
    related: ["samidori", "yabukita", "saemidori"],
  },
  {
    slug: "samidori",
    name: "Samidori",
    title: "Samidori Matcha: Cultivar Profile, Price and Origins",
    h1: "Samidori matcha",
    description: "What the Samidori tea cultivar is, how it differs from Saemidori, and how matcha made from it compares on price, grade and growing region.",
    intro: [
      "Samidori is one of the \"Uji varieties\": a cultivar selected from Uji's native tea plants in the 1950s and grown mainly for shaded teas, tencha (the leaf that becomes matcha) and gyokuro. It is not nationally registered. It is easy to confuse with Saemidori, a different cultivar with a similar name.",
      "Sellers commonly describe Samidori as balanced, sweet and creamy, with low astringency.",
    ],
    profile: [
      ["Origin", "Selected from native Uji tea plants, 1950s"],
      ["Registration", "Not nationally registered"],
      ["Common uses", "Tencha (matcha) and gyokuro"],
      ["Typical description", "Balanced, sweet, creamy, low astringency"],
    ],
    sources: [
      { label: "One With Tea: Samidori vs Saemidori", url: "https://onewithtea.com/blogs/news/cultivar-samidori-saemidori" },
      { label: "Tealife Japanese Tea Pedia: Asahi, Samidori and the Uji varieties", url: "https://japanesetea.sg/japanese-tea-pedia/cultivars/asahi/" },
    ],
    related: ["asahi", "saemidori", "okumidori"],
  },
  {
    slug: "saemidori",
    name: "Saemidori",
    title: "Saemidori Matcha: Cultivar Profile, Price and Origins",
    h1: "Saemidori matcha",
    description: "What the Saemidori tea cultivar is, how it differs from Samidori, and how matcha made from it compares on price, grade and growing region.",
    intro: [
      "Saemidori was bred in Kagoshima and registered in 1990. It is an early-budding cultivar, harvested before Yabukita, and is popular for matcha because of its bright green color and natural sweetness. It is a different cultivar from Samidori.",
      "It is typically described as sweet, round and low in bitterness. Because it is bred for southern climates as well as Kyoto's, matcha made from it comes from a wider spread of regions than the Uji varieties do.",
    ],
    profile: [
      ["Bred", "Kagoshima, registered 1990"],
      ["Budding", "Early, before Yabukita"],
      ["Typical description", "Sweet, round, low bitterness, bright green color"],
    ],
    sources: [
      { label: "One With Tea: Samidori vs Saemidori", url: "https://onewithtea.com/blogs/news/cultivar-samidori-saemidori" },
      { label: "Unearthed Gallery: matcha cultivars explained", url: "https://unearthed-gallery.com/blogs/founders-blog/matcha-cultivars" },
    ],
    related: ["samidori", "yabukita", "okumidori"],
  },
  {
    slug: "asahi",
    name: "Asahi",
    title: "Asahi Matcha: Uji's Prized Cultivar, Price and Origins",
    h1: "Asahi matcha",
    description: "What the Asahi tea cultivar is, why it is prized in Uji, and how matcha made from it compares on price, grade and growing region across brands.",
    intro: [
      "Asahi is a traditional Uji cultivar, selected from native Uji tea plants in 1954 by a farmer, Hirano Jinnojō. It is one of the three \"Uji varieties\" alongside Samidori and Ujihikari, is not nationally registered, and is grown almost entirely for tencha and gyokuro. It is described as demanding: the picking window is narrow.",
      "Several sources describe it as among the highest-priced tencha cultivars, with concentrated umami, sweetness and little bitterness, and it is a staple of competition-grade matcha. Our price data below shows whether that holds across the brands in the database.",
    ],
    profile: [
      ["Selected", "1954, Uji, by Hirano Jinnojō"],
      ["Registration", "Not nationally registered"],
      ["Common uses", "Tencha (matcha); rarely gyokuro"],
      ["Typical description", "Rich umami and sweetness, little bitterness"],
    ],
    sources: [
      { label: "Tealife Japanese Tea Pedia: Asahi", url: "https://japanesetea.sg/japanese-tea-pedia/cultivars/asahi/" },
      { label: "Kyo Hayashiya: Japanese green tea cultivars", url: "https://kyohayashiyamatcha.com/blogs/journal/japanese-tea-cultivars" },
    ],
    related: ["samidori", "gokou", "okumidori"],
  },
  {
    slug: "gokou",
    name: "Gokou",
    title: "Gokou (Gokō) Matcha: Cultivar Profile, Price and Origins",
    h1: "Gokou matcha",
    description: "What the Gokou (Gokō) tea cultivar is, how its aroma is described, and how matcha made from it compares on price, grade and growing region.",
    intro: [
      "Gokou, also written Gokō, is a Kyoto cultivar selected in the early 1950s, around the same time as Samidori and Asahi, and grown mainly in small plots for shaded tea and matcha. It is known for its aroma, which sellers describe as creamy, chocolatey or like steamed milk.",
      "Because it is delicate, it tends to be grown in small quantities and often appears in competition-oriented matcha.",
    ],
    profile: [
      ["Origin", "Kyoto, selected in the early 1950s"],
      ["Common uses", "Tencha (matcha), shaded teas"],
      ["Typical description", "Aromatic: creamy, chocolatey, steamed-milk notes"],
    ],
    sources: [
      { label: "Premium Health Japan: guide to matcha cultivars", url: "https://ujimatchatea.com/blogs/news/matcha-cultivars-guide" },
      { label: "Tealife Japanese Tea Pedia: Gokou", url: "https://japanesetea.sg/japanese-tea-pedia/cultivars/gokou/" },
    ],
    related: ["asahi", "samidori", "okumidori"],
  },
  {
    slug: "tsuyuhikari",
    name: "Tsuyuhikari",
    title: "Tsuyuhikari Matcha: Cultivar Profile, Price and Origins",
    h1: "Tsuyuhikari matcha",
    description: "Where brands say Tsuyuhikari matcha is grown, plus price, grade and flavor notes for matcha that names the Tsuyuhikari cultivar.",
    intro: [
      "Brands name Tsuyuhikari on a number of matcha products, grown in more than one region. Less has been published about it in English than about Yabukita or the Uji varieties, so this page relies on what brands themselves disclose rather than on background claims we could not verify.",
      "The tables below show where the matcha is grown, how brands grade it and what they say it tastes like.",
    ],
    profile: [],
    sources: [],
    related: ["yabukita", "saemidori", "okumidori"],
  },
];

export function cultivarBySlug(slug: string): Cultivar | undefined {
  return CULTIVARS.find((c) => c.slug === slug);
}

export function cultivarSlugFor(name: string | null): string | null {
  if (!name) return null;
  return CULTIVARS.find((c) => c.name.toLowerCase() === name.toLowerCase())?.slug ?? null;
}

export type LoadedCultivar = {
  cultivar: Cultivar;
  s: Summary;
  all: Summary;
  grade: Group[];
  region: Group[];
  brands: Group[];
  flavors: { tag: string; share: number }[];
  picks: ProductRow[];
  studies: number;
  organicShare: number;
};

export async function loadCultivar(cultivar: Cultivar): Promise<LoadedCultivar> {
  const [rows, allRows] = await Promise.all([getGuideRows({ cultivars: [cultivar.name] }), getGuideRows({})]);
  const flavorCounts = new Map<string, number>();
  let withFlavors = 0;
  for (const r of rows) {
    const tags = JSON.parse(r.flavor_tags || "[]") as string[];
    if (tags.length) withFlavors++;
    for (const t of tags) flavorCounts.set(t, (flavorCounts.get(t) ?? 0) + 1);
  }
  return {
    cultivar,
    s: summarize(rows),
    all: summarize(allRows),
    grade: groupBy(rows, "grade"),
    region: groupBy(rows, "region", 2),
    brands: groupBy(rows, "brand_name", 1).slice(0, 8),
    flavors: [...flavorCounts]
      .map(([tag, c]) => ({ tag, share: withFlavors ? c / withFlavors : 0 }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 6),
    picks: pickProducts(rows, 9),
    studies: queryStudies({ q: cultivar.name, pageSize: 1 }).total,
    organicShare: rows.length ? rows.filter((r) => r.organic_certified === 1).length / rows.length : 0,
  };
}
