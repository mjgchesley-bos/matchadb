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
