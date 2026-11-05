import data from "../../data/suppliers.json";

// Wholesale / B2B matcha suppliers. Every field is what the supplier states on its own website
// (see `sources`), checked on `verified`. MatchaDB does not test the products or confirm the
// certificates, and suppliers cannot pay for a listing or edit what is shown.
export type Supplier = {
  slug: string;
  name: string;
  website: string;
  hq: string;
  summary: string;
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
  links: { label: string; url: string }[];
  sources: { label: string; url: string }[];
  verified: string; // YYYY-MM-DD
};

export const SUPPLIERS = data as Supplier[];

export const supplierBySlug = (slug: string): Supplier | undefined => SUPPLIERS.find((s) => s.slug === slug);

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const verifiedOn = (s: Supplier): string => dateFmt.format(new Date(`${s.verified}T00:00:00Z`));
