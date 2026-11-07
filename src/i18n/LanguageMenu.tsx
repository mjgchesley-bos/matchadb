"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_NAMES, localePath, type Locale } from "./config";
import { useLang, useT } from "./client";

export const LANG_COOKIE = "matchadb-lang";

// The path without its language prefix: "/ja/browse" -> "/browse".
export function stripLocale(pathname: string): string {
  const p = pathname.replace(/^\/(ja|ko|zh|es|fr|de)(?=\/|$)/, "");
  return p === "" ? "/" : p;
}

export function goToLocale(target: Locale) {
  try {
    document.cookie = `${LANG_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies blocked: the switch still works for this visit.
  }
  const here = stripLocale(window.location.pathname);
  window.location.assign(localePath(target, here) + window.location.search + window.location.hash);
}

// A globe button in the header that lists the languages.
export function LanguageMenu() {
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("c.lang.change")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-full border border-paper/70 px-3 text-sm font-medium text-paper transition-all hover:bg-paper hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
        </svg>
        <span className="hidden xl:inline">{LOCALE_NAMES[lang]}</span>
        <span className="xl:hidden uppercase">{lang}</span>
      </button>
      {open && (
        <div role="menu" aria-label={t("c.lang.label")} className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-md border border-line bg-paper-raised py-1 shadow-lg">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === lang}
              lang={l}
              onClick={() => (l === lang ? setOpen(false) : goToLocale(l))}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-matcha-soft ${l === lang ? "font-semibold text-matcha" : "text-ink"}`}
            >
              {LOCALE_NAMES[l]}
              {l === lang && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
