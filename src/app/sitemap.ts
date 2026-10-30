import type { MetadataRoute } from "next";
import { getSitemapEntries, getRegionSummary } from "@/lib/db";
import { MIN_PRODUCTS_FOR_PAGE, REGION_CONTENT } from "@/lib/region-content";
import { SITE_URL } from "@/lib/site";
import { getAllStudyIds } from "@/lib/studies";
import { TOPICS } from "@/lib/research-topics";
import { GUIDES } from "@/lib/guides";
import { CULTIVARS } from "@/lib/cultivars";
import { PAIRS, pairSlug } from "@/lib/compare";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { productIds, brands } = await getSitemapEntries();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/map`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/research`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/research/topics`, changeFrequency: "weekly", priority: 0.8 },
    ...TOPICS.map((t) => ({ url: `${SITE_URL}/research/topics/${t.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/cultivars`, changeFrequency: "weekly", priority: 0.8 },
    ...CULTIVARS.map((c) => ({ url: `${SITE_URL}/cultivars/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.8 },
    ...PAIRS.map(([a, b]) => ({ url: `${SITE_URL}/compare/${pairSlug(a, b)}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
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

  return [...staticEntries, ...regionEntries, ...brandEntries, ...productEntries, ...studyEntries];
}
