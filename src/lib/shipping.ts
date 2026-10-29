// Where each brand will actually ship. Matcha is bought from specific online
// shops, and a few of them serve one region only (a Portuguese retailer that
// ships inside the EU, a US store that does not ship abroad). Showing those to
// shoppers who cannot buy them is noise, so the site hides them by default for
// the region the shopper picks and labels them wherever they do appear.
//
// Only restrictions the brand's own policy page states outright are recorded.
// A brand that is not listed here is treated as "no known restriction" and is
// never hidden or flagged -- absence is not evidence of a limit. Add an entry
// only after reading the brand's shipping policy, and keep its source URL.

export type ShipRegion = "US" | "CA" | "UK" | "EU" | "AU" | "JP";

export const SHIP_REGION_LABEL: Record<ShipRegion, string> = {
  US: "United States",
  CA: "Canada",
  UK: "United Kingdom",
  EU: "European Union",
  AU: "Australia",
  JP: "Japan",
};

export const SHIP_REGIONS = Object.keys(SHIP_REGION_LABEL) as ShipRegion[];

export type BrandShipping = {
  // Verified to ship to these regions and no others.
  only?: ShipRegion[];
  // Verified NOT to ship to these regions; everywhere else is unknown/open.
  not?: ShipRegion[];
  // What the brand's own page says, in plain words.
  note: string;
  source: string;
  checked: string; // YYYY-MM-DD the policy was read
};

export const BRAND_SHIPPING: Record<string, BrandShipping> = {
  "Cha Cha Matcha": {
    only: ["US", "CA"],
    note: "Ships to the U.S., Puerto Rico and Canada.",
    source: "https://chachamatcha.com/pages/faq",
    checked: "2026-10-29",
  },
  Dona: {
    only: ["US"],
    note: "Ships to the continental U.S. only.",
    source: "https://drinkdona.com/policies/shipping-policy",
    checked: "2026-10-29",
  },
  "Mantra Matcha": {
    only: ["US"],
    note: "Does not ship outside the U.S.",
    source: "https://mantramatcha.com/policies/shipping-policy",
    checked: "2026-10-29",
  },
  "Matcha Nude": {
    only: ["US"],
    note: "Ships within the United States only.",
    source: "https://matchanude.com/policies/shipping-policy",
    checked: "2026-10-29",
  },
  MatchaDNA: {
    only: ["US"],
    note: "Ships to the US only.",
    source: "https://matchadna.com/policies/shipping-policy",
    checked: "2026-10-29",
  },
  "Naoki Matcha": {
    only: ["US"],
    note: "Orders can only be shipped to addresses in the USA.",
    source: "https://naokimatcha.com/policies/shipping-policy",
    checked: "2026-10-29",
  },
  Ujido: {
    only: ["US"],
    note: "Ships within the USA only.",
    source: "https://ujido.com/pages/shipping-returns",
    checked: "2026-10-29",
  },
  "Matcha Ninja": {
    not: ["US"],
    note: "Ships to Canada, Europe and the rest of the world, but states it does not currently ship to the USA.",
    source: "https://matchaninja.com/policies/shipping-policy",
    checked: "2026-10-29",
  },
  // Not in the database yet; recorded so it is flagged the day it is added.
  "AO Tea": {
    only: ["EU"],
    note: "Ships from Portugal to EU countries and does not offer standard shipping worldwide.",
    source: "https://aotea.store/policies/shipping-policy",
    checked: "2026-10-29",
  },
};

/** False only when the brand's own page says it does not ship to `region`. */
export function brandShipsTo(brand: string, region: ShipRegion): boolean {
  const s = BRAND_SHIPPING[brand];
  if (!s) return true;
  if (s.only) return s.only.includes(region);
  if (s.not) return !s.not.includes(region);
  return true;
}

/** Brands that are verified NOT to ship to `region` (hidden by the filter). */
export function brandsNotShippingTo(region: ShipRegion): string[] {
  return Object.keys(BRAND_SHIPPING).filter((b) => !brandShipsTo(b, region));
}

export function parseShipRegion(v: string | undefined): ShipRegion | undefined {
  return SHIP_REGIONS.includes(v as ShipRegion) ? (v as ShipRegion) : undefined;
}

/**
 * The "ships to" choice from the URL. Shoppers are assumed to be in the US
 * (most of this site's traffic is) unless they pick another region; "any"
 * switches the filter off.
 */
export function resolveShipsTo(v: string | undefined): ShipRegion | undefined {
  if (v === "any") return undefined;
  return parseShipRegion(v) ?? "US";
}

/** Short label for a restricted brand, or null when no restriction is known. */
export function shippingLabel(brand: string): string | null {
  const s = BRAND_SHIPPING[brand];
  if (!s) return null;
  if (s.only) {
    const names = s.only.map((r) => (r === "US" ? "US" : r === "UK" ? "UK" : r === "EU" ? "EU" : SHIP_REGION_LABEL[r]));
    return `Ships to ${names.join(" & ")} only`;
  }
  if (s.not) return `Doesn't ship to the ${s.not.map((r) => (r === "US" ? "US" : SHIP_REGION_LABEL[r])).join(" or ")}`;
  return null;
}

export function shippingInfo(brand: string): BrandShipping | null {
  return BRAND_SHIPPING[brand] ?? null;
}
