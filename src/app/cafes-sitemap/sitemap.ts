import type { MetadataRoute } from "next";
import { getAllCafes, SITEMAP_CHUNK, cafeSitemapCount } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";
import { SITE_URL } from "@/lib/site";

// The café pages, 10,000 per file: /cafes-sitemap/sitemap/0.xml, 1.xml, ... (robots.txt lists them all).
// One file with every café was ~6.5 MB; the host refuses to serve a response over 6 MB (HTTP 413), so Google could not read it.
// Only the English URL is listed: each café page names its other-language versions in its own <head> (hreflang).
export async function generateSitemaps() {
  return Array.from({ length: cafeSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  return getAllCafes()
    .slice(id * SITEMAP_CHUNK, (id + 1) * SITEMAP_CHUNK)
    .map((c) => ({ url: `${SITE_URL}/cafes/${cafeSlug(c)}`, changeFrequency: "monthly" as const, priority: 0.4 }));
}
