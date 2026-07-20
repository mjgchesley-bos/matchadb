// Real-world coordinates for every distinct `region` value in the database
// (checked against the data: 15 distinct values across 547 of 728 products).
// Japanese entries are specific tea-growing towns/prefectures and are
// precise. China/Korea/Taiwan are country-level only in our source data (no
// sub-region was ever captured), so their coordinates are a single
// representative point in a well-known tea-growing area of that country --
// labeled as country-level, not claimed as a specific farm location.
export type RegionInfo = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  precision: "town" | "country";
};

export const REGION_COORDINATES: Record<string, RegionInfo> = {
  Uji: { name: "Uji", country: "Japan", lat: 34.8845, lng: 135.7997, precision: "town" },
  Kyoto: { name: "Kyoto", country: "Japan", lat: 35.0116, lng: 135.7681, precision: "town" },
  Kagoshima: { name: "Kagoshima", country: "Japan", lat: 31.5966, lng: 130.5571, precision: "town" },
  Shizuoka: { name: "Shizuoka", country: "Japan", lat: 34.9756, lng: 138.3827, precision: "town" },
  Nishio: { name: "Nishio", country: "Japan", lat: 34.8564, lng: 137.0466, precision: "town" },
  Yame: { name: "Yame", country: "Japan", lat: 33.2038, lng: 130.5586, precision: "town" },
  Wazuka: { name: "Wazuka", country: "Japan", lat: 34.7967, lng: 135.9328, precision: "town" },
  Shirakawa: { name: "Shirakawa (Uji)", country: "Japan", lat: 34.8725, lng: 135.8167, precision: "town" },
  Nara: { name: "Nara", country: "Japan", lat: 34.6851, lng: 135.8048, precision: "town" },
  Aichi: { name: "Aichi", country: "Japan", lat: 35.1802, lng: 136.9066, precision: "town" },
  Kyushu: { name: "Kyushu", country: "Japan", lat: 32.7503, lng: 130.75, precision: "town" },
  Miyazaki: { name: "Miyazaki", country: "Japan", lat: 31.9111, lng: 131.4239, precision: "town" },
  China: { name: "China", country: "China", lat: 30.2741, lng: 120.1551, precision: "country" },
  Korea: { name: "Korea", country: "South Korea", lat: 35.0667, lng: 127.75, precision: "country" },
  Taiwan: { name: "Taiwan", country: "Taiwan", lat: 23.912, lng: 120.686, precision: "country" },
};

export function getRegionInfo(region: string | null): RegionInfo | null {
  if (!region) return null;
  return REGION_COORDINATES[region] ?? null;
}
