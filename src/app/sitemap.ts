import type { MetadataRoute } from "next";
import { getSitemapEntries, getRegionSummary } from "@/lib/db";
import { MIN_PRODUCTS_FOR_PAGE, REGION_CONTENT } from "@/lib/region-content";
import { SITE_URL } from "@/lib/site";
import { getAllStudyIds } from "@/lib/studies";
import { TOPICS } from "@/lib/research-topics";
import { GUIDES } from "@/lib/guides";
import { CULTIVARS } from "@/lib/cultivars";
import { PAIRS, pairSlug } from "@/lib/compare";
import { SUPPLIERS } from "@/lib/suppliers";
import { getStores } from "@/lib/stores";
import { HTML_LANG, LOCALES, localePath } from "@/i18n/config";

// Pages that exist in every language: one entry per language, each pointing at all the others.
function multilingual(path: string, changeFrequency: "daily" | "weekly" | "monthly" | "yearly", priority: number): MetadataRoute.Sitemap {
  const abs = (l: (typeof LOCALES)[number]) => SITE_URL + (path === "/" && l === "en" ? "" : localePath(l, path));
  const languages = { ...Object.fromEntries(LOCALES.map((l) => [HTML_LANG[l], abs(l)])), "x-default": abs("en") };
  return LOCALES.map((l) => ({ url: abs(l), changeFrequency, priority: l === "en" ? priority : Math.max(0.1, priority - 0.1), alternates: { languages } }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { productIds, brands } = await getSitemapEntries();

  const staticEntries: MetadataRoute.Sitemap = [
    ...multilingual("/", "weekly", 1),
    ...multilingual("/browse", "daily", 0.9),
    ...multilingual("/map", "monthly", 0.7),
    { url: `${SITE_URL}/research`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/research/topics`, changeFrequency: "weekly", priority: 0.8 },
    ...TOPICS.map((t) => ({ url: `${SITE_URL}/research/topics/${t.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...multilingual("/stores", "weekly", 0.8),
    ...multilingual("/cafes", "weekly", 0.9),
    { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/guides/what-is-ceremonial-matcha`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/cultivars`, changeFrequency: "weekly", priority: 0.8 },
    ...CULTIVARS.map((c) => ({ url: `${SITE_URL}/cultivars/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.8 },
    ...PAIRS.map(([a, b]) => ({ url: `${SITE_URL}/compare/${pairSlug(a, b)}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/wholesale`, changeFrequency: "weekly", priority: 0.7 },
    ...multilingual("/hall-of-fame", "monthly", 0.6),
    ...getStores().filter((x) => x.commentsFrom).map((x) => ({ url: `${SITE_URL}/stores/${x.id}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...SUPPLIERS.map((s) => ({ url: `${SITE_URL}/wholesale/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...multilingual("/about", "monthly", 0.5),
    ...multilingual("/contact", "yearly", 0.3),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const regionSummaries = await Promise.all(Object.keys(REGION_CONTENT).map((k) => getRegionSummary(k)));
  const regionEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/regions`, changeFrequency: "weekly", priority: 0.8 },
    ...regionSummaries
      .filter((s): s is NonNullable<typeof s> => s !== null && s.productCount >= MIN_PRODUCTS_FOR_PAGE)
      .map((s) => ({
        url: `${SITE_URL}/regions/${REGION_CONTENT[s.region].slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];

  const brandEntries: MetadataRoute.Sitemap = brands.map((name) => ({
    url: `${SITE_URL}/brands/${encodeURIComponent(name)}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${SITE_URL}/products/${id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const studyEntries: MetadataRoute.Sitemap = getAllStudyIds().map((id) => ({
    url: `${SITE_URL}/research/${id}`,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  // Café pages are in their own sitemap files (app/cafes-sitemap/sitemap.ts): all of them in this file made it ~6.5 MB, over the host's 6 MB limit.

  return [...staticEntries, ...regionEntries, ...brandEntries, ...productEntries, ...studyEntries];
}
