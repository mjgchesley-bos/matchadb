import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LOCALES } from "@/i18n/config";
import { cafeSitemapCount } from "@/lib/cafes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", ...LOCALES.filter((l) => l !== "en").map((l) => `/${l}/account`)],
    },
    sitemap: [`${SITE_URL}/sitemap.xml`, ...Array.from({ length: cafeSitemapCount() }, (_, i) => `${SITE_URL}/cafes-sitemap/sitemap/${i}.xml`)],
  };
}
