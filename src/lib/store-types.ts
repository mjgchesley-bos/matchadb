// Types and labels for the store directory. Kept apart from stores.ts, which reads
// data/stores.json from disk and so can only run on the server.

export type StoreKind = "brand-shop" | "retailer";

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
  url: string;
  brands: StoreBrand[];
  note?: string;
  checked: string;
};

export const KIND_LABEL: Record<StoreKind, string> = {
  "brand-shop": "Brand's own shop",
  retailer: "Retailer",
};
