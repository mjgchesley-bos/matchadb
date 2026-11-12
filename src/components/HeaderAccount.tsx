"use client";

import Link from "@/i18n/Link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { TierIcon } from "@/components/TierIcon";
import { NotificationBell } from "@/components/NotificationBell";
import { useT } from "@/i18n/client";

// "Sign in" in the header, or the person's initial with a small menu once signed in.
export function HeaderAccount() {
  const t = useT();
  const { ready, user, displayName, isPublic, avatar, stats, signIn, signOut } = useAuth();
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

  // Reserve the space so the header doesn't jump once the session is known.
  if (!ready) return <span className="inline-block h-9 w-[4.5rem] sm:h-10" aria-hidden="true" />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signIn()}
        className="inline-flex items-center rounded-full border border-paper/70 px-3.5 sm:px-5 py-2 sm:py-2.5 text-sm font-medium tracking-wide text-paper transition-all hover:bg-paper hover:text-ink"
      >
        {t("c.account.signIn")}
      </button>
    );
  }

  const initial = (displayName ?? user.email ?? "M").trim().charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1.5">
    <NotificationBell />
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("c.account.yours")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-paper text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        {avatar.key || avatar.path ? <Avatar avatar={avatar.key} photoPath={avatar.path} name={displayName} size={36} /> : initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-md border border-line bg-paper-raised py-1 shadow-lg">
          <p className="px-4 pt-2 pb-1 text-xs text-ink-faint">{t("c.account.signedInAs")}</p>
          <p className="px-4 text-sm font-medium text-ink truncate">{displayName ?? "…"}</p>
          <p className="flex items-center gap-1.5 px-4 pb-2 text-xs text-ink-faint">
            {stats ? (
              <>
                <TierIcon tier={stats.tier} size={14} />
                {t("c.account.points", { tier: stats.tier, points: stats.points })}
              </>
            ) : (
              "\u00a0"
            )}
          </p>
          <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-ink hover:bg-matcha-soft">
            {t("c.account.mine")}
          </Link>
          {isPublic && displayName && (
            <Link href={`/u/${encodeURIComponent(displayName)}`} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-ink hover:bg-matcha-soft">
              {t("c.account.profile")}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-matcha-soft"
          >
            {t("c.account.signOut")}
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
