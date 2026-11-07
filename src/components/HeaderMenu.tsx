"use client";

import Link from "@/i18n/Link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { Key } from "@/i18n/dictionaries";

// The three-dots menu in the site header (like the one in Chrome): secondary
// destinations that don't need a permanent button in the bar.
const ITEMS: { href: string; label: Key; note: Key }[] = [
  { href: "/cafes", label: "c.menu.cafes.label", note: "c.menu.cafes.note" },
  { href: "/stores", label: "c.menu.stores.label", note: "c.menu.stores.note" },
  { href: "/wholesale", label: "c.menu.wholesale.label", note: "c.menu.wholesale.note" },
  { href: "/research", label: "c.menu.research.label", note: "c.menu.research.note" },
  { href: "/cultivars", label: "c.menu.cultivars.label", note: "c.menu.cultivars.note" },
  { href: "/guides/what-is-ceremonial-matcha", label: "c.menu.ceremonial.label", note: "c.menu.ceremonial.note" },
];

export function HeaderMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
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
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("c.menu.more")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-paper text-ink transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label={t("c.menu.morePages")} className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-line bg-paper-raised py-1 shadow-lg">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 hover:bg-matcha-soft focus-visible:bg-matcha-soft focus-visible:outline-none"
            >
              <span className="block text-sm font-medium text-ink">{t(item.label)}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{t(item.note)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
