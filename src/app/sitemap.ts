import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { productIds, brands } = await getSitemapEntries();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/map`, changeFrequency: "monthly", priority: 0.7 },
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

  return [...staticEntries, ...brandEntries, ...productEntries];
}
