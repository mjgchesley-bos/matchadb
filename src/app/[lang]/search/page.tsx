import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { searchAll } from "@/lib/site-search";
import { langOf } from "@/i18n/params";
import { localePath } from "@/i18n/config";
import { getT } from "@/i18n/server";

// Every result for one search: cafés and shops, places, brands, products, producers, regions and cultivars together. The header box and the home page search land here.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

const TITLE: Record<string, string> = { products: "c.search.products", brands: "c.search.brands", producers: "c.search.producers", cafes: "c.search.cafes", places: "c.search.places", regions: "c.search.regions", cultivars: "c.search.cultivars" };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ q?: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const res = (q.length >= 2 ? await searchAll(q, { scale: 5 }) : null) as { groups: { key: string; hits: { label: string; sub?: string; href: string }[] }[]; closest: boolean } | null;
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{t("search.title")}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">{q ? `“${q}”` : t("search.title")}</h1>
      <form action={localePath(lang, "/search")} role="search" className="mt-5 flex gap-2">
        <input name="q" defaultValue={q} type="search" placeholder={t("c.search.ph")} aria-label={t("c.search.ph")} autoComplete="off" className="min-w-0 flex-1 rounded-full border-2 border-line-strong bg-paper-raised px-5 py-3 text-base text-ink placeholder:text-ink-faint focus:border-matcha focus:outline-none" />
        <button type="submit" className="rounded-full bg-matcha px-6 py-3 text-sm font-medium text-paper hover:bg-forest">{t("search.title")}</button>
      </form>

      {res && res.groups.length === 0 && <p className="mt-6 text-ink-muted">{t("c.search.popular")}</p>}
      {res && res.closest && res.groups.length > 0 && <p className="mt-6 text-sm text-ink-muted">{t("c.search.closest")}</p>}
      <div className="mt-6 flex flex-col gap-5">
        {res?.groups.map((g) => (
          <section key={g.key} className="rounded-md border-2 border-matcha/60 bg-gradient-to-br from-matcha-soft/60 to-paper-raised p-5 shadow-sm">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{t((TITLE[g.key] ?? "c.search.products") as "c.search.products")} ({g.hits.length})</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {g.hits.map((h) => (
                <li key={h.href}>
                  <Link href={h.href} className="block rounded-sm border border-line bg-paper-raised px-4 py-2.5 hover:border-matcha hover:bg-matcha-soft">
                    <span className="block text-sm font-medium text-ink">{h.label}</span>
                    {h.sub && <span className="block text-xs text-ink-faint">{h.sub}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {q && <p className="mt-6 text-sm"><Link href={`/browse?q=${encodeURIComponent(q)}`} className="text-matcha underline hover:text-forest">{t("nav.search.long")}: “{q}” →</Link></p>}
    </main>
  );
}
