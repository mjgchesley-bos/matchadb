import { messagesFor } from "./dictionaries";
import type { Key } from "./dictionaries";
import type { Locale } from "./config";
import { format } from "./format";

export type TFn = (key: Key, vars?: Record<string, string | number>) => string;

const cache = new Map<Locale, Record<string, string>>();

// Server-side translator: const t = getT(lang); t("nav.map")
export function getT(lang: Locale): TFn {
  let m = cache.get(lang);
  if (!m) {
    m = messagesFor(lang);
    cache.set(lang, m);
  }
  const msgs = m;
  return (key, vars) => format(msgs[key] ?? key, vars);
}

// Translate a value that comes from the database (a grade, flavor, use or region name):
// tv("flavor", "Umami"). Falls back to the original text when there is no translation.
export type TVFn = (group: string, value: string) => string;
export function getTV(lang: Locale): TVFn {
  const msgs = messagesFor(lang);
  return (group, value) => msgs[`v.${group}.${value}`] ?? value;
}

// The strings client components need ("c." keys), handed to the provider so the browser doesn't download the whole dictionary.
export function clientMessages(lang: Locale): Record<string, string> {
  const all = messagesFor(lang);
  const out: Record<string, string> = {};
  for (const k of Object.keys(all)) if (k.startsWith("c.") || k.startsWith("v.")) out[k] = all[k];
  return out;
}
