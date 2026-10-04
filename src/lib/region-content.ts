// Editorial intros for the /regions pages. Deliberately short and limited to
// widely documented facts or what the brands' own disclosures show -- the
// numbers on each page (computed from the database) carry the substance.
// A region only gets a page if it has an entry here AND enough products for
// the comparisons to mean something (see MIN_PRODUCTS_FOR_PAGE).
export const MIN_PRODUCTS_FOR_PAGE = 5;

export type RegionContent = {
  slug: string;
  intro: string;
  // Shown under the intro when the region key is a disclosure-level quirk
  // readers should know about, e.g. "Kyoto" meaning the brand only said Kyoto.
  note?: string;
};

export const REGION_CONTENT: Record<string, RegionContent> = {
  Uji: {
    slug: "uji",
    intro:
      "Uji, just south of Kyoto city, is widely regarded as the traditional home of Japanese matcha and gyokuro, and it's where many of the country's oldest tea houses are based. It's also the origin disclosed on more products in this database than any other region.",
  },
  Kyoto: {
    slug: "kyoto",
    intro:
      "Products listed here come from Kyoto Prefecture's tea houses and growers, which includes Uji but also other tea areas.",
    note: "Brands under this heading disclosed only \"Kyoto\" without a specific town, so we show it as its own group rather than guessing a more precise location.",
  },
  Shizuoka: {
    slug: "shizuoka",
    intro:
      "Shizuoka Prefecture is one of Japan's two largest tea-growing prefectures, alongside Kagoshima, and is best known for sencha. Matcha from here is less associated with ceremonial tradition than Uji's, and prices in this database reflect that.",
    note: "Brands under this heading disclosed only \"Shizuoka\" without a specific town.",
  },
  Kagoshima: {
    slug: "kagoshima",
    intro:
      "Kagoshima, at the southern end of Kyushu, is one of Japan's largest tea-growing prefectures. Its warm southern climate suits large-scale tea production, and the prefecture is known for organic tea.",
  },
  Nishio: {
    slug: "nishio",
    intro:
      "Nishio, in Aichi Prefecture, is a major matcha-producing area and the home of large producers including Aiya and Aoi Tea, both of which supply matcha in wholesale quantities to brands and manufacturers.",
  },
  Yame: {
    slug: "yame",
    intro:
      "Yame, in Fukuoka Prefecture on Kyushu, is best known for shade-grown teas such as gyokuro, and it has become a source of ceremonial matcha sold by both Japanese producers and Western importers.",
  },
  Wazuka: {
    slug: "wazuka",
    intro:
      "Wazuka is a mountain town in southern Kyoto Prefecture, southeast of Uji, and a notable tea-growing area, with tea planted on steep hillsides.",
  },
  Shirakawa: {
    slug: "shirakawa",
    intro:
      "Shirakawa is a tea-growing district within Uji. It isn't a separate municipality, so on the map it shares Uji's boundary.",
  },
  China: {
    slug: "china",
    intro:
      "These products disclose only \"China\" as their origin, with no province, region, or farm named. Because the country is so large, a country-level origin says little about how or where the tea was grown.",
  },
};

export function regionFromSlug(slug: string): string | null {
  for (const [key, content] of Object.entries(REGION_CONTENT)) {
    if (content.slug === slug) return key;
  }
  return null;
}
