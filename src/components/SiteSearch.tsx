"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "@/i18n/Link";
import { useT } from "@/i18n/client";

type Hit = { label: string; sub?: string; href: string };
type Result = { groups: { key: string; hits: Hit[] }[]; closest: boolean; popular: Hit[] };
const TITLE: Record<string, string> = { products: "c.search.products", brands: "c.search.brands", producers: "c.search.producers", cafes: "c.search.cafes", places: "c.search.places", regions: "c.search.regions", cultivars: "c.search.cultivars" };

// The site-wide search bar in the header: cafés, places, brands and products in one box. Enter opens the full /search results page.
export function SiteSearch({ variant = "header" }: { variant?: "header" | "hero" }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const hero = variant === "hero";
  // The home page has its own big search bar, so the small one in the header steps aside there.
  const onHome = /^\/(ja|ko|zh|es|fr|de)?\/?$/.test(pathname || "/");
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) {
      setRes(null);
      return;
    }
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(v)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setRes(j))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  if (!hero && onHome) return null;
  const close = () => setOpen(false);
  const head = "px-4 pt-3 pb-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-forest";
  const row = "block px-4 py-2 text-sm text-ink hover:bg-matcha-soft focus-visible:bg-matcha-soft focus-visible:outline-none";

  return (
    <div ref={rootRef} className={hero ? "relative mx-auto w-full max-w-2xl text-left" : "relative w-full sm:w-72 lg:w-80"}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          if (v) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(v)}`);
          }
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={t("c.search.ph")}
          aria-label={t("c.search.ph")}
          autoComplete="off"
          className={hero ? "w-full rounded-full border border-line-strong bg-paper-raised px-6 py-4 text-base sm:text-lg text-ink shadow-sm placeholder:text-ink-faint focus:border-matcha focus:outline-2 focus:outline-matcha" : "w-full rounded-full bg-paper px-4 py-2 sm:py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-offset-2 focus:outline-paper"}
        />
      </form>
      {open && res && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-md border border-line bg-paper-raised pb-2 shadow-lg">
          {res.closest && res.groups.length > 0 && <p className="px-4 pt-3 text-sm text-ink-muted">{t("c.search.closest")}</p>}
          {res.groups.length === 0 && <p className="px-4 pt-3 text-sm text-ink-muted">{t("c.search.popular")}</p>}
          {res.groups.map((g) => (
            <div key={g.key}>
              <p className={head}>{t((TITLE[g.key] ?? "c.search.products") as "c.search.products")}</p>
              {g.hits.map((h) => (
                <Link key={h.href} href={h.href} onClick={close} className={row}>
                  {h.label} {h.sub && <span className="text-ink-faint">· {h.sub}</span>}
                </Link>
              ))}
            </div>
          ))}
          {res.groups.length === 0 && res.popular.map((h) => (
            <Link key={h.href} href={h.href} onClick={close} className={row}>
              {h.label} {h.sub && <span className="text-ink-faint">· {h.sub}</span>}
            </Link>
          ))}
          <div className="mt-1 border-t border-line px-4 pt-2 text-sm">
            <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={close} className="font-medium text-matcha hover:underline">{t("c.search.all", { q: q.trim() })}</Link>
            {res.groups.length === 0 && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
                <span>{t("c.search.try")}</span>
                <Link href="/matcha-map" onClick={close} className="underline hover:text-ink">{t("c.search.exCafes")}</Link>
                <Link href="/map" onClick={close} className="underline hover:text-ink">{t("c.search.exMap")}</Link>
                <Link href="/browse" onClick={close} className="underline hover:text-ink">{t("c.search.exBrowse")}</Link>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
