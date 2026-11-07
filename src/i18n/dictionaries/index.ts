import { en, type Key } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { zh } from "./zh";
import { es } from "./es";
import { fr } from "./fr";
import { de } from "./de";
import type { Locale } from "../config";

export type { Key };
export type Messages = Partial<Record<Key, string>>;

const DICTS: Record<Locale, Messages> = { en, ja, ko, zh, es, fr, de };

// A missing translation falls back to English, so an unfinished page is never blank or broken.
export function messagesFor(lang: Locale): Record<string, string> {
  return lang === "en" ? { ...en } : { ...en, ...DICTS[lang] };
}
