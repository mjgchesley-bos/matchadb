import type { Locale } from "../config";
import { format } from "../format";
import ja from "./ja";
import ko from "./ko";
import zh from "./zh";
import es from "./es";
import fr from "./fr";
import de from "./de";

// Long-form page content (guides, region and cultivar write-ups, research topics...). The English text stays in the code
// that renders it; these files hold the translations, keyed by an id, and a missing id falls back to the English text.
// Server components only: nothing here is sent to the browser.
const ALL: Record<Exclude<Locale, "en">, Record<string, string>> = { ja, ko, zh, es, fr, de };

export type CFn = (key: string, en: string, vars?: Record<string, string | number>) => string;

export function getC(lang: Locale): CFn {
  const m = lang === "en" ? null : ALL[lang];
  return (key, en, vars) => format(m?.[key] ?? en, vars);
}
