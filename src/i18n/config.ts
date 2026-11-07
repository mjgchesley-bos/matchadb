// Languages the site is available in. English is the default and keeps its unprefixed URLs
// (/browse); every other language lives under its own prefix (/ja/browse).
export const LOCALES = ["en", "ja", "ko", "zh", "es", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(x: string | undefined | null): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

// Each language's name in itself (what a visitor looks for in the language switcher).
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

// BCP 47 tag for <html lang>, hreflang and Intl formatting.
export const HTML_LANG: Record<Locale, string> = { en: "en", ja: "ja", ko: "ko", zh: "zh-Hans", es: "es", fr: "fr", de: "de" };
export const INTL_LANG: Record<Locale, string> = { en: "en-US", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", es: "es-ES", fr: "fr-FR", de: "de-DE" };
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", ja: "ja_JP", ko: "ko_KR", zh: "zh_CN", es: "es_ES", fr: "fr_FR", de: "de_DE" };

// Prefix an internal path with the language: ("ja", "/browse?x=1") -> "/ja/browse?x=1". English stays unprefixed.
export function localePath(lang: Locale, path: string): string {
  if (lang === DEFAULT_LOCALE || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === "/" ) return `/${lang}`;
  if (/^\/(ja|ko|zh|es|fr|de)(\/|\?|#|$)/.test(path)) return path; // already prefixed
  if (/^\/(api|data|images|logos|region-|_next)(\/|$)/.test(path) || /\.[a-z0-9]{2,5}($|\?)/i.test(path.split("?")[0]) && !path.split("?")[0].endsWith("/")) return path;
  return `/${lang}${path}`;
}

// 1234.5 -> "1,234.5" (en) / "1.234,5" (de) / etc.
export function fmtNum(lang: Locale, n: number): string {
  return n.toLocaleString(INTL_LANG[lang]);
}
