import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";

// The page's language, read from its route. An unknown language code is a 404.
export async function langOf(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}
