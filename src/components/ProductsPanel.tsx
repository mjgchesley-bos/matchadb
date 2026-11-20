"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSb } from "@/lib/demo";

export type Product = { id: string; name: string; description: string; price: string; url: string | null };
const BLANK = { name: "", description: "", price: "", url: "" };

// The owner's list of things they sell (name, explanation, price, link). Used inside the café page editor and on the wholesaler / brand business page.
export function ProductsPanel({ onChange, title = "Products you sell" }: { onChange?: (p: Product[]) => void; title?: string }) {
  const supabase = useSb();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase().from("business_products").select("id, name, description, price, url").order("created_at").then(({ data, error }) => {
      if (!live || error) return;
      const list = (data as Product[]) ?? [];
      setProducts(list);
      onChange?.(list);
    });
    return () => { live = false; };
    // onChange is a state setter from the parent; it is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, supabase]);

  if (!user || products === null) return null;
  const set = (list: Product[]) => { setProducts(list); onChange?.(list); };
  const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
  const lbl = "block text-sm text-ink-muted";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const url = form.url.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) return setMsg("The link must start with https://");
    setBusy(true);
    setMsg(null);
    const row = { name: form.name.trim(), description: form.description.trim(), price: form.price.trim(), url: url || null };
    if (editing) {
      const { error } = await supabase().from("business_products").update(row).eq("id", editing);
      if (error) setMsg("Could not save that listing.");
      else { set(products!.map((p) => (p.id === editing ? { ...p, ...row } : p))); setForm(BLANK); setEditing(null); }
    } else {
      const { data, error } = await supabase().from("business_products").insert({ user_id: user.id, ...row }).select("id, name, description, price, url").single();
      if (error || !data) setMsg("Could not add that listing (60 is the limit).");
      else { set([...products!, data as Product]); setForm(BLANK); }
    }
    setBusy(false);
  }
  async function remove(id: string) {
    await supabase().from("business_products").delete().eq("id", id);
    set(products!.filter((p) => p.id !== id));
    if (editing === id) { setEditing(null); setForm(BLANK); }
  }

  return (
    <section className="rounded-sm border-2 border-line bg-paper-raised p-5" aria-labelledby="prod-h">
      <h2 id="prod-h" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">{title} ({products.length})</h2>
      <p className="mt-1 text-sm text-ink-muted">Tins, whisks, gift boxes, merch: anything you sell. Each shows on your public page with its price and a link to buy.</p>
      {products.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-sm border border-line bg-paper px-4 py-3 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{p.name}</span>
                {p.price && <span className="tabular-nums text-ink-muted">{p.price}</span>}
              </p>
              {p.description && <p className="mt-1 whitespace-pre-line text-ink-muted">{p.description}</p>}
              <p className="mt-2 flex gap-4 text-xs">
                <button type="button" onClick={() => { setEditing(p.id); setForm({ name: p.name, description: p.description, price: p.price, url: p.url ?? "" }); }} className="text-matcha underline hover:text-forest">Edit</button>
                <button type="button" onClick={() => void remove(p.id)} className="text-ink-muted underline hover:text-ink">Delete</button>
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="mt-4 flex max-w-xl flex-col gap-3">
        <p className="text-sm font-medium text-ink">{editing ? "Edit listing" : "Add a product"}</p>
        <label className={lbl}>Product name<input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
        <label className={lbl}>About this product<textarea maxLength={800} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={lbl}>Price (as you want it shown, e.g. $24 / 30 g)<input maxLength={40} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={input} /></label>
          <label className={lbl}>Link to buy or learn more<input maxLength={200} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" className={input} /></label>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{editing ? "Save changes" : "Add product"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(BLANK); }} className="text-sm text-ink-muted underline hover:text-ink">Cancel</button>}
        </div>
        {msg && <p className="text-sm text-ink" role="status">{msg}</p>}
      </form>
    </section>
  );
}
