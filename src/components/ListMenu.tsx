"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

// Product page: "Add to a list" menu showing the member's own lists with a check for the ones
// that already hold this matcha, plus a quick way to start a new list.
type Row = { id: string; name: string; has: boolean };

export function ListMenu({ productId, productName }: { productId: number; productName: string }) {
  const { user, signIn } = useAuth();
  const t = useT();
  const uid = user?.id ?? null;
  const [rows, setRows] = useState<{ uid: string; list: Row[] } | null>(null);
  const list = uid && rows?.uid === uid ? rows.list : null;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!uid || !open) return;
    let live = true;
    const sb = supabase();
    Promise.all([sb.from("custom_shelves").select("id, name").order("created_at", { ascending: true }), sb.from("custom_shelf_items").select("shelf_id").eq("product_id", productId)]).then(([l, i]) => {
      if (!live) return;
      const have = new Set((i.data ?? []).map((x) => x.shelf_id as string));
      setRows({ uid, list: (l.data ?? []).map((s) => ({ id: s.id as string, name: s.name as string, has: have.has(s.id as string) })) });
    });
    return () => {
      live = false;
    };
  }, [uid, open, productId, tick]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async (r: Row) => {
    if (!user) return;
    setMsg(null);
    const sb = supabase();
    const { error } = r.has
      ? await sb.from("custom_shelf_items").delete().eq("shelf_id", r.id).eq("product_id", productId)
      : await sb.from("custom_shelf_items").insert({ shelf_id: r.id, user_id: user.id, product_id: productId });
    if (error) return setMsg(error.message.includes("up to 100") ? t("c.lm.full") : t("c.lm.fail"));
    setTick((t) => t + 1);
  };

  const create = async () => {
    if (!user || !name.trim()) return;
    setMsg(null);
    const sb = supabase();
    const { data, error } = await sb.from("custom_shelves").insert({ user_id: user.id, name: name.trim() }).select("id").single();
    if (error || !data) return setMsg(error?.message.includes("up to 10") ? t("c.lm.max") : error?.code === "23505" ? t("c.lm.dup") : t("c.lm.createFail"));
    await sb.from("custom_shelf_items").insert({ shelf_id: data.id, user_id: user.id, product_id: productId });
    window.gtag?.("event", "list_create");
    setName("");
    setTick((t) => t + 1);
  };

  return (
    <div ref={root} className="relative mt-3">
      <button
        type="button"
        onClick={() => (user ? setOpen((o) => !o) : signIn(t("c.lm.signIn", { name: productName })))}
        aria-haspopup="true"
        aria-expanded={open}
        className="rounded-full border border-line-strong bg-paper-raised px-3.5 py-1.5 text-sm text-ink hover:bg-matcha-soft"
      >
        {t("c.lm.btn")}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-md border border-line bg-paper-raised p-3 shadow-lg">
          {list === null ? (
            <p className="text-sm text-ink-faint">{t("c.lm.loading")}</p>
          ) : (
            <>
              {list.length === 0 && <p className="text-sm text-ink-muted">{t("c.lm.none")}</p>}
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {list.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1 text-sm text-ink hover:bg-matcha-soft">
                      <input type="checkbox" checked={r.has} onChange={() => void toggle(r)} className="accent-matcha" />
                      {r.name}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2 border-t border-line pt-2">
                <label htmlFor="menu-new-list" className="sr-only">
                  {t("c.lm.newLabel")}
                </label>
                <input
                  id="menu-new-list"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 40))}
                  onKeyDown={(e) => e.key === "Enter" && void create()}
                  placeholder={t("c.lm.newPh")}
                  className="min-w-0 flex-1 rounded-sm border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
                />
                <button type="button" onClick={create} disabled={!name.trim()} className="rounded-full bg-matcha px-3 py-1.5 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
                  {t("c.lm.add")}
                </button>
              </div>
              {msg && <p className="mt-2 text-xs text-red-700">{msg}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
