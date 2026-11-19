import { notFound, permanentRedirect } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";

// The store finder is now part of the Matcha map; a brand in the link carries over.
export default async function StoresIndexRedirect({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (typeof sp.brand === "string") q.set("brand", sp.brand);
  permanentRedirect(localePath(lang, "/matcha-map") + `?${q}`);
}
