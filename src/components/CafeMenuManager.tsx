"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSb } from "@/lib/demo";
import { useT } from "@/i18n/client";

type Item = { id: number; name: string; price: string | null; description: string | null; is_matcha: boolean };

// The owner's own menu for a café (supabase/tiers_menus_dms.sql). Everyone sees the items; the owner of a café (approved by the site owner) can add,
// change and remove them. Anyone else gets "Update menu", which asks to be approved as this café's owner.
export function CafeMenuManager({ cafeId, cafeName, children, fallbackTitle }: { cafeId: string; cafeName: string; children?: React.ReactNode; fallbackTitle?: string }) {
  const t = useT();
  const supabase = useSb();
  const { user, signIn } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [owner, setOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [claim, setClaim] = useState(false);
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState({ name: "", price: "", description: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const uid = user?.id ?? null;

  const load = useCallback(async () => {
    const { data, error } = await supabase().from("cafe_menu_items").select("id, name, price, description, is_matcha").eq("cafe_id", cafeId).order("id");
    if (!error) setItems((data as Item[]) ?? []);
  }, [cafeId, supabase]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!uid) { setOwner(false); return; }
    let live = true;
    supabase().from("cafe_owners").select("cafe_id").eq("cafe_id", cafeId).maybeSingle().then(({ data }) => live && setOwner(!!data));
    return () => { live = false; };
  }, [uid, cafeId, supabase]);

  const input = "w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase().from("cafe_menu_items").insert({ cafe_id: cafeId, name: draft.name.trim(), price: draft.price.trim() || null, description: draft.description.trim() || null });
    if (error) return setMsg(t("c.mn.err"));
    setDraft({ name: "", price: "", description: "" });
    await load();
  }
  async function remove(id: number) {
    await supabase().from("cafe_menu_items").delete().eq("id", id);
    await load();
  }
  async function requestClaim() {
    setMsg(null);
    const { error } = await supabase().from("account_requests").insert({ kind: "cafe_owner", business: cafeName.slice(0, 80), cafe_id: cafeId });
    if (error) return setMsg(t("c.mn.err"));
    setSent(true);
  }

  const hasOwnMenu = items.length > 0;
  // No owner-added menu: the page's own evidence (what we found on the café's website) is the menu section, so there is only ever one.
  if (!hasOwnMenu && !owner && !user && !children) {
    return (
      <p className="mt-6 text-sm">
        <button type="button" onClick={() => signIn(t("c.mn.signin"))} className="text-matcha underline hover:text-forest">{t("c.mn.update")}</button>
      </p>
    );
  }
  return (
    <section className="mt-8 rounded-sm border border-line bg-paper-raised p-5" aria-labelledby="owner-menu">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="owner-menu" className={hasOwnMenu || !children ? "font-display text-lg font-semibold text-ink" : "font-mono text-xs uppercase tracking-[0.2em] text-forest"}>{hasOwnMenu || !children ? t("c.mn.h") : fallbackTitle ?? t("c.mn.h")}</h2>
        {owner ? (
          <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-full border border-line-strong px-4 py-1.5 text-sm text-ink hover:bg-matcha-soft">{editing ? t("c.mn.done") : t("c.mn.update")}</button>
        ) : (
          <button type="button" onClick={() => (user ? setClaim((v) => !v) : signIn(t("c.mn.signin")))} className="rounded-full border border-line-strong px-4 py-1.5 text-sm text-ink hover:bg-matcha-soft">{t("c.mn.update")}</button>
        )}
      </div>
      {items.length > 0 ? (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((i) => (
              <li key={i.id} className={`flex items-start justify-between gap-4 rounded-sm border px-4 py-2.5 ${i.is_matcha ? "border-2 border-matcha bg-matcha-soft" : "border-line bg-paper"}`}>
                <span className="min-w-0"><span className="block text-sm font-medium text-ink">{i.name}{i.is_matcha && <span className="ml-2 rounded-full bg-matcha px-2 py-0.5 align-middle text-[0.65rem] font-medium uppercase tracking-wide text-paper">Matcha</span>}</span>{i.description && <span className="block text-xs text-ink-muted">{i.description}</span>}</span>
                <span className="flex items-center gap-3 text-sm text-ink-muted">{i.price}{owner && editing && <button type="button" onClick={() => void remove(i.id)} className="text-xs text-ink-faint underline hover:text-ink">{t("c.mn.remove")}</button>}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">{t("c.mn.note")}</p>
        </>
      ) : children ? (
        <div className="mt-3">{children}</div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">{t("c.mn.empty")}</p>
      )}
      {owner && editing && (
        <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[1fr_7rem]">
          <input required minLength={2} maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t("c.mn.name")} className={input} />
          <input maxLength={20} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder={t("c.mn.price")} className={input} />
          <input maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={t("c.mn.desc")} className={`${input} sm:col-span-2`} />
          <div className="sm:col-span-2"><button type="submit" className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">{t("c.mn.add")}</button></div>
        </form>
      )}
      {!owner && claim && (
        <div className="mt-4 rounded-sm bg-paper p-4 text-sm text-ink-muted">
          {sent ? <p className="text-ink" role="status">{t("c.mn.sent")}</p> : (
            <>
              <p>{t("c.mn.claimIntro")}</p>
              <button type="button" onClick={() => void requestClaim()} className="mt-3 rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">{t("c.mn.claim")}</button>
            </>
          )}
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-red-700" role="alert">{msg}</p>}
    </section>
  );
}
