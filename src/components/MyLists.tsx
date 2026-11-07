"use client";

import Link from "@/i18n/Link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// My matcha: your own lists ("Best for lattes", "Gift ideas"). Add matchas to a list from any
// product page; manage them here. Lists appear on your public profile if it is switched on.
type ListRow = { id: string; name: string; items: number[] };
type Item = { id: number; name: string; brand: string; price: string | null };

export function MyLists() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [state, setState] = useState<{ uid: string; lists: ListRow[] } | null>(null);
  const lists = uid && state?.uid === uid ? state.lists : null;
  const [products, setProducts] = useState<Record<number, Item>>({});
  const [tick, setTick] = useState(0);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    const sb = supabase();
    (async () => {
      const [l, i] = await Promise.all([
        sb.from("custom_shelves").select("id, name").order("created_at", { ascending: true }),
        sb.from("custom_shelf_items").select("shelf_id, product_id").order("added_at", { ascending: false }),
      ]);
      if (!live) return;
      const rows = (l.data ?? []).map((s) => ({ id: s.id as string, name: s.name as string, items: (i.data ?? []).filter((x) => x.shelf_id === s.id).map((x) => x.product_id as number) }));
      setState({ uid, lists: rows });
      const ids = [...new Set(rows.flatMap((r) => r.items))];
      if (ids.length) {
        const found = (await fetch(`/api/products/lookup?ids=${ids.join(",")}`).then((res) => res.json())) as Item[];
        if (live) setProducts(Object.fromEntries(found.map((f) => [f.id, f])));
      }
    })();
    return () => {
      live = false;
    };
  }, [uid, tick]);

  const create = async () => {
    if (!user || !name.trim()) return;
    setMsg(null);
    const { error } = await supabase().from("custom_shelves").insert({ user_id: user.id, name: name.trim() });
    if (error) return setMsg(error.message.includes("up to 10") ? "You can have up to 10 lists." : error.code === "23505" ? "You already have a list with that name." : "Couldn't create the list.");
    setName("");
    setTick((t) => t + 1);
  };
  const del = async (l: ListRow) => {
    if (!confirm(`Delete the list "${l.name}"?`)) return;
    await supabase().from("custom_shelves").delete().eq("id", l.id);
    setTick((t) => t + 1);
  };
  const removeItem = async (listId: string, productId: number) => {
    await supabase().from("custom_shelf_items").delete().eq("shelf_id", listId).eq("product_id", productId);
    setTick((t) => t + 1);
  };

  if (!user) return null;
  return (
    <section aria-labelledby="lists-h">
      <h2 id="lists-h" className="font-display text-xl font-semibold text-ink">
        My lists
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="new-list" className="sr-only">
          New list name
        </label>
        <input
          id="new-list"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          onKeyDown={(e) => e.key === "Enter" && void create()}
          placeholder="New list, for example Best for lattes"
          className="w-72 max-w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
        />
        <button type="button" onClick={create} disabled={!name.trim()} className="rounded-full bg-matcha px-4 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
          Create list
        </button>
        {msg && <span className="text-sm text-red-700">{msg}</span>}
      </div>
      {lists === null ? (
        <p className="mt-3 text-sm text-ink-faint">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No lists yet. Create one, then add matchas from any product page with <strong>Add to a list</strong>.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {lists.map((l) => (
            <div key={l.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-ink">
                  {l.name} <span className="font-normal text-ink-faint">({l.items.length})</span>
                </h3>
                <button type="button" onClick={() => void del(l)} className="text-sm text-ink-muted underline hover:text-ink">
                  Delete list
                </button>
              </div>
              {l.items.length === 0 ? (
                <p className="mt-1 text-sm text-ink-faint">Empty.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line border-y border-line">
                  {l.items.map((id) => (
                    <li key={id} className="flex items-center justify-between gap-4 py-2.5">
                      <Link href={`/products/${id}`} className="text-ink hover:text-matcha">
                        <span className="block text-xs text-ink-faint">{products[id]?.brand ?? ""}</span>
                        <span className="font-medium">{products[id]?.name ?? `Product ${id}`}</span>
                      </Link>
                      <button type="button" onClick={() => void removeItem(l.id, id)} className="text-sm text-ink-muted underline hover:text-ink">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
