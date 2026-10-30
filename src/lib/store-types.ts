// Types and labels for the store directory. Kept apart from stores.ts, which reads
// data/stores.json from disk and so can only run on the server.

export type StoreKind = "brand-shop" | "cafe" | "retailer";

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

export const KIND_LABEL: Record<StoreKind, string> = {
  "brand-shop": "Brand's own shop",
  cafe: "Café serving it",
  retailer: "Retailer",
};
