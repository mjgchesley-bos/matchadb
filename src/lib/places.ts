// Named districts and towns that brands disclose inside the broader region
// buckets on the sourcing map (Uji, Kagoshima, Shizuoka...). A brand that
// writes "Ogura, Uji, Kyoto" on its own product page is telling us more than
// "Uji", so the map shows that finer place too.
//
// How a place gets here: its name appears in the origin/region/producer text a
// brand published for at least two products (see getMapBreakdown in db.ts), and
// its coordinates were checked against the Mapbox geocoder. These are
// district- or town-level points, not farm locations: the brand named the
// place, not the field. Passing mentions that turned out not to be a source
// (a producer described as sitting "at the crossroads of" two districts) were
// left out deliberately.
export type Place = {
  key: string;
  name: string;
  area: string; // human-readable parent, shown in popups
  lat: number;
  lng: number;
  // Regular-expression sources matched against a brand's own origin text.
  terms: string[];
  // A product only counts if its structured region bucket is one of these,
  // which keeps look-alike words in unrelated text from creating a match.
  regions: string[];
};

export const PLACES: Place[] = [
  { key: "ogura", name: "Ogura", area: "Uji, Kyoto", lat: 34.8932, lng: 135.7813, terms: ["Ogura"], regions: ["Uji", "Kyoto"] },
  { key: "gokasho", name: "Gokasho", area: "Uji, Kyoto", lat: 34.9129, lng: 135.804, terms: ["Gokasho"], regions: ["Uji", "Kyoto"] },
  { key: "ujitawara", name: "Ujitawara", area: "Kyoto", lat: 34.8542, lng: 135.8874, terms: ["Ujitawara", "Tawara"], regions: ["Uji", "Kyoto"] },
  { key: "kyotanabe", name: "Kyotanabe", area: "Kyoto", lat: 34.8205, lng: 135.7711, terms: ["Kyotanabe"], regions: ["Uji", "Kyoto"] },
  { key: "minamiyamashiro", name: "Minamiyamashiro", area: "Kyoto", lat: 34.7668, lng: 136.0013, terms: ["Minamiyamashiro"], regions: ["Uji", "Kyoto", "Wazuka"] },
  { key: "kirishima", name: "Kirishima", area: "Kagoshima", lat: 31.7388, lng: 130.7659, terms: ["Kirishima"], regions: ["Kagoshima"] },
  { key: "chiran", name: "Chiran", area: "Minamikyushu, Kagoshima", lat: 31.3777, lng: 130.4416, terms: ["Chiran"], regions: ["Kagoshima"] },
  { key: "hoshino", name: "Hoshino", area: "Yame, Fukuoka", lat: 33.2498, lng: 130.7617, terms: ["Hoshino"], regions: ["Yame"] },
  { key: "haruno", name: "Haruno (Tenryu)", area: "Hamamatsu, Shizuoka", lat: 35.0111, lng: 137.8668, terms: ["Haruno", "Tenry[uū]"], regions: ["Shizuoka"] },
  { key: "makinohara", name: "Makinohara", area: "Shizuoka", lat: 34.7178, lng: 138.1853, terms: ["Makinohara"], regions: ["Shizuoka"] },
];
