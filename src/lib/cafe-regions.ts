// The parts of the world the café finder covers. Each region has its own map list
// (public/data/cafes-slim-{key}.json), so visitors only download the part they look at.

export type RegionKey = "us" | "ca" | "eu" | "jp" | "kr" | "au";

export type Region = {
  key: RegionKey;
  label: string;
  // Lower-case ISO country codes, as Mapbox's geocoder wants them.
  countries: string[];
  bounds: [[number, number], [number, number]];
  // Distances are shown in miles in the US and kilometres elsewhere.
  unit: "mi" | "km";
  placeholder: string;
};

export const EUROPE = ["gb", "ie", "fr", "de", "it", "es", "pt", "nl", "be", "lu", "at", "ch", "se", "no", "dk", "fi", "is", "pl", "cz", "sk", "hu", "gr", "ro", "bg", "hr", "si", "ee", "lv", "lt", "mt", "cy"];

export const REGIONS: Region[] = [
  { key: "us", label: "United States", countries: ["us"], bounds: [[-125, 24.5], [-66.5, 49.5]], unit: "mi", placeholder: "e.g. 90028 or Austin, TX" },
  { key: "ca", label: "Canada", countries: ["ca"], bounds: [[-135, 42], [-52, 60]], unit: "km", placeholder: "e.g. M5V 2T6 or Vancouver" },
  { key: "eu", label: "Europe", countries: EUROPE, bounds: [[-11, 35], [32, 60]], unit: "km", placeholder: "e.g. London, Paris or 10115" },
  { key: "jp", label: "Japan", countries: ["jp"], bounds: [[129, 31], [146, 45.7]], unit: "km", placeholder: "e.g. Tokyo or Kyoto" },
  { key: "kr", label: "South Korea", countries: ["kr"], bounds: [[125.5, 33], [130, 38.7]], unit: "km", placeholder: "e.g. Seoul or Busan" },
  { key: "au", label: "Australia", countries: ["au"], bounds: [[112, -44.5], [154.5, -10]], unit: "km", placeholder: "e.g. Sydney or 3000" },
];

export const regionByKey = (k: string | undefined | null): Region => REGIONS.find((r) => r.key === k) ?? REGIONS[0];

export function regionForCountry(code: string | undefined | null): RegionKey | null {
  const c = (code ?? "").toLowerCase();
  return REGIONS.find((r) => r.countries.includes(c))?.key ?? null;
}

export const ALL_COUNTRIES = REGIONS.flatMap((r) => r.countries);
