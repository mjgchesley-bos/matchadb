"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

// A bell in the header: who hearted your comments, and who commented on or rated the places you have also taken part in.
// The rows are written by database triggers (supabase/notifications.sql); the bell stays hidden until that table exists.

type N = { id: number; kind: "heart" | "comment" | "rating"; actor_name: string; target_type: "product" | "brand" | "cafe"; target_key: string; created_at: string; read_at: string | null };
type Label = { name: string; href: string };

const keyOf = (n: Pick<N, "target_type" | "target_key">) => `${n.target_type}:${n.target_key}`;

export function NotificationBell() {
  const t = useT();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [list, setList] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, Label>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const sb = supabase();
    const [rows, count] = await Promise.all([
      sb.from("notifications").select("id, kind, actor_name, target_type, target_key, created_at, read_at").order("created_at", { ascending: false }).limit(20),
      sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (rows.error) return;                       // table not created yet: no bell
    setEnabled(true);
    setList((rows.data as N[] | null) ?? []);
    setUnread(count.count ?? 0);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const first = window.setTimeout(() => void load(), 0);
    const every = window.setInterval(() => void load(), 60000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [uid, load]);

  // Names and links for the places mentioned.
  useEffect(() => {
    const cafes = [...new Set(list.filter((n) => n.target_type === "cafe").map((n) => n.target_key))].filter((k) => !labels[`cafe:${k}`]);
    const products = [...new Set(list.filter((n) => n.target_type === "product").map((n) => n.target_key))].filter((k) => !labels[`product:${k}`]);
    let live = true;
    const add = (extra: Record<string, Label>) => live && Object.keys(extra).length && setLabels((cur) => ({ ...cur, ...extra }));
    const extra: Record<string, Label> = {};
    for (const n of list) if (n.target_type === "brand" && !labels[keyOf(n)]) extra[keyOf(n)] = { name: n.target_key, href: `/brands/${encodeURIComponent(n.target_key)}` };
    add(extra);
    if (cafes.length)
      void fetch(`/api/cafes/lookup?ids=${cafes.join(",")}`)
        .then((r) => r.json())
        .then((rows: { id: string; name: string; slug: string }[]) => add(Object.fromEntries(rows.map((r) => [`cafe:${r.id}`, { name: r.name, href: `/cafes/${r.slug}` }]))))
        .catch(() => {});
    if (products.length)
      void fetch(`/api/products/lookup?ids=${products.join(",")}`)
        .then((r) => r.json())
        .then((rows: { id: number; name: string; brand: string }[]) => add(Object.fromEntries(rows.map((r) => [`product:${r.id}`, { name: `${r.brand} ${r.name}`, href: `/products/${r.id}` }]))))
        .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

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

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const { error } = await supabase().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
      if (!error) setUnread(0);               // the list keeps showing which ones were new until it is reloaded
    }
  };

  if (!uid || !enabled) return null;
  const text = (n: N, what: string) => t(n.kind === "heart" ? "c.nt.heart" : n.kind === "comment" ? "c.nt.comment" : "c.nt.rating", { who: n.actor_name, what });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={unread ? t("c.nt.bellUnread", { count: unread }) : t("c.nt.bell")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-paper transition-colors hover:bg-paper/15"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-center text-[0.65rem] font-semibold leading-[1.1rem] text-white tabular-nums">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-paper-raised shadow-lg">
          <p className="border-b border-line px-4 py-2.5 text-sm font-medium text-ink">{t("c.nt.title")}</p>
          {list.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-muted">{t("c.nt.none")}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {list.map((n) => {
                const lab = labels[keyOf(n)];
                const body = text(n, lab?.name ?? "…");
                return (
                  <li key={n.id} className="border-b border-line last:border-0">
                    {lab ? (
                      <Link href={lab.href} role="menuitem" onClick={() => setOpen(false)} className={`block px-4 py-3 text-sm text-ink hover:bg-matcha-soft ${n.read_at ? "" : "bg-matcha-soft/60"}`}>
                        {body}
                      </Link>
                    ) : (
                      <p className="px-4 py-3 text-sm text-ink-muted">{body}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
