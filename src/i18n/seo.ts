import { SITE_URL } from "@/lib/site";
import { HTML_LANG, LOCALES, localePath, type Locale } from "./config";

// Canonical URL plus hreflang links for a page that exists in every language.
// `path` is the English path without a language prefix ("/browse"); use "/" for the home page.
export function pageAlternates(lang: Locale, path: string) {
  const abs = (l: Locale) => SITE_URL + (path === "/" && l === "en" ? "" : localePath(l, path));
  return {
    canonical: abs(lang),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [HTML_LANG[l], abs(l)])),
      "x-default": abs("en"),
    },
  };
}
