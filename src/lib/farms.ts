// Specific named farms/gardens, distinct from the city/prefecture-level
// REGION_COORDINATES pins. Most brands only disclose a city or prefecture
// ("Uji, Kyoto"), which is what the region map already shows. A handful
// name an actual farm or sub-region -- this file holds only the ones where
// that name resolved to a real, independently verifiable location distinct
// enough from its city-level pin to be worth a separate marker (checked
// against every "farm"/"tea garden"/"producer" field across all 728
// products; most named gardens turned out to have no publicly findable
// location beyond the city already on the map, so they're not listed here).
// No property/parcel boundaries are included anywhere on this site -- no
// public registry publishes land-parcel outlines for private tea farms, so
// drawing one would mean inventing a shape that doesn't correspond to
// anything real.
export type FarmLocation = {
  name: string;
  brand: string;
  productIds: number[];
  lat: number;
  lng: number;
  description: string;
  sourceUrl: string;
};

export const FARM_LOCATIONS: FarmLocation[] = [
  {
    name: "Hattori Tea Farm",
    brand: "Matchaful",
    productIds: [410, 411, 412],
    // Kikugawa City center -- the farm's own page gives a full street
    // address (340 Kurasawa, Kikugawa City, Shizuoka 439-0002), but without
    // a geocoding API this is the most precise point we can verify; still a
    // real, distinct town ~40km from the generic "Shizuoka" pin.
    lat: 34.75,
    lng: 138.083,
    description:
      "A fourth-generation, single-estate family farm in Kikugawa City, Shizuoka -- run by Hattori-san.",
    sourceUrl: "https://hattori-tea-farm.com/pages/company",
  },
  {
    name: "Isagawa Valley (Osada Seicha)",
    brand: "Tezumi",
    productIds: [624, 646],
    // Haruno, Tenryu-ku, Hamamatsu -- the specific mountain subregion named
    // on Tezumi's own product page, not the broader "Shizuoka" prefecture.
    lat: 35.0,
    lng: 137.9,
    description:
      "A remote, 20-hectare organic mountain plantation at 300-600m altitude in the Haruno subregion of Tenryū, Shizuoka.",
    sourceUrl: "https://www.tezumi.com/products/organic-haruto-matcha",
  },
];
