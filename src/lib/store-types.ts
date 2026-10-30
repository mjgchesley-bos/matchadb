// Types and labels for the store directory. Kept apart from stores.ts, which reads
// data/stores.json from disk and so can only run on the server.

export type StoreKind = "brand-shop" | "cafe" | "retailer";

// What a brand's matcha is like, summarized from our product database, for the map popup.
export type BrandMatchaInfo = {
  products: number;
  // Grades the brand's products come in, most common first (Ceremonial, Koicha, ...).
  grades: string[];
  // Lowest and highest verified price per gram across the brand's products, if any.
  perGram: [number, number] | null;
};

export type StoreBrand = {
  // Must match a brand name in the database, so it can link to the brand page.
  name: string;
  // The page that says this store carries the brand.
  evidence: string;
};

export type Store = {
  id: string;
  name: string;
  kind: StoreKind;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  // The place's own website, when it has one. Left out rather than pointing at a social page.
  url?: string;
  // Set when the entry comes from a brand's own store locator rather than the place's website.
  listedBy?: string;
  brands: StoreBrand[];
  note?: string;
  checked: string;
};

// An online reseller, or an Amazon store/listing, for a brand. Each one carries the
// page that backs it (data/resellers.json).
export type Reseller = {
  brand: string;
  name: string;
  channel: "online" | "amazon";
  // True when Amazon is the only place we found the brand sold; the page shows "(Amazon)"
  // next to the name.
  amazonOnly?: boolean;
  url: string;
  basis: string;
  evidence: string;
  checked: string;
};

// National or regional chains a brand says it is sold through, from the brand's own page
// (data/chains.json). Chain-level only: we do not know which individual stores stock it.
export type ChainListing = {
  brand: string;
  evidence: string;
  evidenceLabel: string;
  checked: string;
  chains: { name: string; select?: boolean }[];
};

export const KIND_LABEL: Record<StoreKind, string> = {
  "brand-shop": "Brand's own shop",
  cafe: "Café serving it",
  retailer: "Retailer",
};
