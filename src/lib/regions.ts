// Real-world coordinates for every distinct `region` value in the database.
// Japanese entries are specific tea-growing towns/prefectures and are
// precise. Zhejiang and Jeju are provinces -- one level less precise than a
// Japanese town, one level more precise than a bare country -- pulled from
// disclosed text that named the actual province/island even though the
// database's structured region defaulted to the country (Numi's "Zhejiang,
// China -- ... single Verified Fair Labor(TM) farm"; Grin Mood's "Jeju
// Island, South Korea"). China/Taiwan remain country-level: no sub-region
// was ever disclosed for their other products, so a province pin there
// would just be a guess, not a verified location.
export type RegionInfo = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  precision: "town" | "province" | "country";
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
  Zhejiang: { name: "Zhejiang", country: "China", lat: 30.2937, lng: 120.1614, precision: "province" },
  Jeju: { name: "Jeju Island", country: "South Korea", lat: 33.5097, lng: 126.5219, precision: "province" },
  China: { name: "China", country: "China", lat: 30.2741, lng: 120.1551, precision: "country" },
  Korea: { name: "Korea", country: "South Korea", lat: 35.0667, lng: 127.75, precision: "country" },
  Taiwan: { name: "Taiwan", country: "Taiwan", lat: 23.912, lng: 120.686, precision: "country" },
};

export function getRegionInfo(region: string | null): RegionInfo | null {
  if (!region) return null;
  return REGION_COORDINATES[region] ?? null;
}
