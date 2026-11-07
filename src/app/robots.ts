import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LOCALES } from "@/i18n/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", ...LOCALES.filter((l) => l !== "en").map((l) => `/${l}/account`)],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
