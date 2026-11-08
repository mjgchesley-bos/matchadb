import type { MapLocation } from "./map-data";
import type { Locale } from "@/i18n/config";
import { getT, getTV } from "@/i18n/server";
import { getC } from "@/i18n/content";
import { regionCountry } from "./regions";
import { REGION_CONTENT } from "./region-content";

// The sourcing map's data is computed in English on the server; this swaps the text a visitor reads
// (region names, intros, how precise a pin is) for their language before it goes to the browser.
const PRECISION: Record<string, Parameters<ReturnType<typeof getT>>[0]> = {
  "The whole country, outlined because it is small enough for that to be informative.": "mp.prec.countryBoundary",
  "Outlined with the real administrative boundary.": "mp.prec.boundary",
  "Country-level only: no more specific growing location was disclosed.": "mp.prec.country",
  "Province-level: more specific than a country, not a single farm.": "mp.prec.province",
  "No single boundary exists for this region, so it is shown as a point.": "mp.prec.point",
  "A district or town that brands name on their own product pages. It is a place, not a single farm.": "mp.prec.place",
  "A specific farm named by the brand, with its location independently verified. The outline, where shown, is the administrative area around it, not the farm's own property line.": "mp.prec.farm",
};

export function localizeLocations(locs: MapLocation[], lang: Locale): MapLocation[] {
  if (lang === "en") return locs;
  const t = getT(lang);
  const tv = getTV(lang);
  const c = getC(lang);
  return locs.map((l) => {
    const slug = l.regionKey ? REGION_CONTENT[l.regionKey]?.slug : undefined;
    const base: MapLocation = { ...l, precision: PRECISION[l.precision] ? t(PRECISION[l.precision]) : l.precision };
    if (l.kind === "region") {
      return {
        ...base,
        name: l.regionKey ? tv("region", l.regionKey) : l.name,
        sub: regionCountry(l.sub, lang),
        intro: l.intro && slug ? c(`rc.${slug}.intro`, l.intro) : l.intro,
        note: l.note && slug ? c(`rc.${slug}.note`, l.note) : l.note,
      };
    }
    if (l.kind === "place") {
      return { ...base, sub: l.sub.split(", ").map((p) => tv("region", p)).join(", ") };
    }
    const key = l.id.replace(/^farm:/, "");
    return {
      ...base,
      sub: t("mp.supplies", { brand: l.sub.replace(/^Supplies /, "") }),
      intro: l.intro ? c(`mp.farm.${key}`, l.intro) : l.intro,
      source: l.source ? { ...l.source, label: t("mp.verifiedSource") } : null,
    };
  });
}
