import { notFound, permanentRedirect } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";

// The café finder and the store finder are now one page: the Matcha map.
export default async function CafesIndexRedirect({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  permanentRedirect(localePath(lang, "/matcha-map") + (q.size ? `?${q}` : ""));
}
