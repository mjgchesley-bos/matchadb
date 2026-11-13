import data from "../../data/suppliers.json";

// Wholesale / B2B matcha suppliers. Every field is what the supplier states on its own website
// (see `sources`), checked on `verified`. MatchaDB does not test the products or confirm the
// certificates, and suppliers cannot pay for a listing or edit what is shown.
export type Tag = "bulk" | "cafe" | "retail" | "private-label" | "ingredient";
export type How = "form" | "email" | "portal" | "online" | "marketplace";

export const TAG_LABELS: Record<Tag, string> = {
  bulk: "Bulk matcha",
  cafe: "Cafés & foodservice",
  retail: "Shops & resale",
  "private-label": "Private label / OEM",
  ingredient: "Food & drink makers",
};

export const TAG_HINTS: Record<Tag, string> = {
  bulk: "States bulk sizes (kilos, large bags, cases or pallets)",
  cafe: "Serves cafés, restaurants or hospitality",
  retail: "Sells to shops and resellers",
  "private-label": "Offers private label, white label or OEM",
  ingredient: "Serves manufacturers and ingredient buyers",
};

// Where a supplier says it sells or ships, only when its own wholesale page states it.
export type Serves = "us" | "ca" | "eu" | "au" | "intl";
export const SERVES_LABELS: Record<Serves, string> = {
  us: "United States",
  ca: "Canada",
  eu: "UK & Europe",
  au: "Australia",
  intl: "Ships internationally",
};

export const HOW_LABELS: Record<How, string> = {
  form: "Apply or inquire online",
  email: "Inquire by email",
  portal: "Wholesale login",
  online: "Order online without an application",
  marketplace: "Order on Faire",
};

// The long-form detail page (only for suppliers with a full profile).
export type Profile = {
  origins: string[];
  products: string[];
  organic: string;
  minimumOrder: string;
  samples: string;
  documentation: string;
  certifications: string[];
  customers: string;
  privateLabel: string;
  shipping: string;
  pricing: string;
};

// One product, product line or option a supplier lists on its own site (shown as a card on its profile page).
export type CatalogItem = {
  name: string;
  grade?: "Ceremonial" | "Culinary" | "Latte grade"; // the same standard labels the product database uses (set only when the supplier's own name for the item says so)
  region?: string; // the same standard region labels as the product database (Uji, Kagoshima, Shizuoka...)
  origin?: string;
  cultivar?: string;
  shading?: string;
  picking?: string;
  harvest?: string;
  uses?: string[]; // what the supplier says it is for (usucha, latte, baking...)
  badges?: string[]; // claims such as "Organic and conventional", worded as the supplier states them
  notes: string; // a short plain description paraphrased from the supplier's own page
  flavor?: { sweetness: number; bitterness: number; aroma: number; foam: number; finish: number }; // the supplier's own 0-5 ratings
  options?: string[]; // sizes and choices as the supplier states them
  price?: string; // as listed by the supplier, with the pack size only when it states one
  priceNote?: string;
  url?: string; // the product's page on the supplier's site
};

export type Supplier = {
  slug: string;
  name: string;
  website: string;
  url: string; // the supplier's own wholesale page
  brands: string[]; // brands in the MatchaDB database that this supplier sells
  tags: Tag[];
  how: How[];
  serves?: Serves[];
  summary: string;
  facts: string[];
  note?: string;
  hq?: string;
  links?: { label: string; url: string }[];
  sources: { label: string; url: string }[];
  verified: string; // YYYY-MM-DD
  profile?: Profile;
  catalog?: CatalogItem[];
  catalogNote?: string;
};

export const SUPPLIERS = data as Supplier[];

// What the database knows about the products behind a supplier (computed at build time from the
// brands it sells), shown and filterable on the directory.
export type ProductType = "ceremonial" | "culinary" | "organic";
export const TYPE_LABELS: Record<ProductType, string> = {
  ceremonial: "Ceremonial grade",
  culinary: "Culinary & latte grade",
  organic: "Organic-certified",
};
export type SupplierView = Supplier & { regions: string[]; types: ProductType[] };

export const supplierBySlug = (slug: string): Supplier | undefined => SUPPLIERS.find((s) => s.slug === slug);
export const suppliersForBrand = (brand: string): Supplier[] => SUPPLIERS.filter((s) => s.brands.includes(brand));
export const profiled = (): Supplier[] => SUPPLIERS.filter((s) => s.profile);

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const verifiedOn = (s: Supplier): string => dateFmt.format(new Date(`${s.verified}T00:00:00Z`));


// Standard labels for a wholesale card, in the same vocabulary as the consumer product cards. A grade is taken from the
// item's name only when the name points to exactly one grade ("Ceremonial matcha" yes; "ceremonial and culinary" no).
export function itemGrade(i: CatalogItem): CatalogItem["grade"] | undefined {
  if (i.grade) return i.grade;
  const hits = new Set<NonNullable<CatalogItem["grade"]>>();
  if (/ceremonial/i.test(i.name)) hits.add("Ceremonial");
  if (/culinary|baking/i.test(i.name)) hits.add("Culinary");
  if (/latte/i.test(i.name)) hits.add("Latte grade");
  return hits.size === 1 ? [...hits][0] : undefined;
}

const REGION_WORDS: [RegExp, string][] = [
  [/\buji\b/i, "Uji"],
  [/kagoshima/i, "Kagoshima"],
  [/shizuoka/i, "Shizuoka"],
  [/nishio|aichi/i, "Nishio"],
  [/\byame\b/i, "Yame"],
  [/wazuka/i, "Wazuka"],
  [/china|guizhou|zhejiang/i, "China"],
];
export function itemRegion(i: CatalogItem): string | undefined {
  if (i.region) return i.region;
  const hits = new Set(REGION_WORDS.filter(([re]) => i.origin && re.test(i.origin)).map(([, r]) => r));
  return hits.size === 1 ? [...hits][0] : undefined;
}
