"use client";

import Link from "@/i18n/Link";
import { useContext, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FeedbackButton } from "@/components/FeedbackButton";
import { DemoCtx, useSb } from "@/lib/demo";
import { OK_IMAGE, shrinkImage } from "@/lib/image-upload";

import { bannerUrl } from "@/lib/business";

type Product = { id: string; name: string; description: string; price: string; url: string | null };
const BLANK = { name: "", description: "", price: "", url: "" };

// Tools for approved café-owner and wholesaler accounts: a banner photo for the public profile and a list of products with an explanation, price and link.
// (Needs supabase/business_profiles.sql; the panel stays quiet until it has been run.)
export function BusinessTools({ contactEmail }: { contactEmail: string }) {
  const supabase = useSb();
  const demo = useContext(DemoCtx);
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [type, setType] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    const sb = supabase();
    sb.from("profiles").select("account_type, banner_path").eq("id", uid).maybeSingle().then(({ data, error }) => {
      if (!live) return;
      if (error) return setType(null);
      const d = data as { account_type: string; banner_path?: string | null } | null;
      setType(d?.account_type ?? null);
      setBanner(d?.banner_path ?? null);
    });
    sb.from("business_products").select("id, name, description, price, url").order("created_at").then(({ data, error }) => live && !error && setProducts((data as Product[]) ?? []));
    return () => { live = false; };
  }, [uid, supabase]);

  if (!user || !type || type === "general" || products === null) return null;
  const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
  const lbl = "block text-sm text-ink-muted";

  async function uploadBanner(file: File | undefined) {
    if (!file || !user) return;
    if (!OK_IMAGE.test(file.type)) return setMsg("Use a JPEG, PNG or WebP picture.");
    setBusy(true);
    setMsg(null);
    try {
      const blob = await shrinkImage(file, 1800);
      const path = `${user.id}/banner-${Date.now()}.jpg`;
      const up = await supabase().storage.from("business-banners").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase().from("profiles").update({ banner_path: path }).eq("id", user.id);
      if (error) throw error;
      if (banner) await supabase().storage.from("business-banners").remove([banner]);
      setBanner(path);
      setMsg("Banner saved. It shows at the top of your public profile.");
    } catch {
      setMsg("The banner could not be saved. Try a smaller picture.");
    }
    setBusy(false);
  }

  async function removeBanner() {
    if (!user || !banner) return;
    await supabase().from("profiles").update({ banner_path: null }).eq("id", user.id);
    await supabase().storage.from("business-banners").remove([banner]);
    setBanner(null);
  }

  async function saveProduct(e: React.FormEvent) {
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
      else {
        setProducts(products!.map((p) => (p.id === editing ? { ...p, ...row } : p)));
        setForm(BLANK);
        setEditing(null);
      }
    } else {
      const { data, error } = await supabase().from("business_products").insert({ user_id: user.id, ...row }).select("id, name, description, price, url").single();
      if (error || !data) setMsg("Could not add that listing (60 is the limit).");
      else {
        setProducts([...products!, data as Product]);
        setForm(BLANK);
      }
    }
    setBusy(false);
  }

  async function removeProduct(id: string) {
    await supabase().from("business_products").delete().eq("id", id);
    setProducts(products!.filter((p) => p.id !== id));
    if (editing === id) {
      setEditing(null);
      setForm(BLANK);
    }
  }

  return (
    <section className="rounded-sm border-2 border-matcha bg-paper-raised p-5 sm:p-6" aria-labelledby="biz-tools-h">
      <h2 id="biz-tools-h" className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Your business page</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">Add a banner and your products. They appear on your public profile. Edit prices and descriptions any time.</p>
      {type === "cafe_owner" && (
        <p className="mt-4 rounded-sm border-2 border-matcha bg-matcha-soft px-4 py-3 text-sm text-ink">
          <strong>Your café page:</strong> add a cover photo, your story, hours, menu, photos and all your social links, like your own landing page.{" "}
          {demo ? <span className="font-medium text-forest">Edit it in Screen 2 below.</span> : <Link href="/business" className="font-medium text-matcha underline hover:text-forest">Edit your café page</Link>}
        </p>
      )}

      <div className="mt-5 rounded-sm border border-line p-4">
        <h3 className="font-display text-base font-semibold text-ink">Banner photo</h3>
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element -- member banner from storage
          <img src={bannerUrl(banner)} alt="Your banner" className="mt-3 h-32 w-full rounded-sm border border-line object-cover sm:h-40" />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className={`cursor-pointer rounded-full border border-line-strong bg-paper px-4 py-2 text-ink hover:bg-matcha-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {banner ? "Change banner" : "Upload a banner"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void uploadBanner(e.target.files?.[0])} />
          </label>
          {banner && <button type="button" onClick={() => void removeBanner()} className="text-ink-muted underline hover:text-ink">Remove</button>}
          <span className="text-xs text-ink-faint">Wide pictures work best (about 3:1).</span>
        </div>
      </div>

      <div className="mt-5 rounded-sm border border-line p-4">
        <h3 className="font-display text-base font-semibold text-ink">Products ({products.length})</h3>
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
                  <button type="button" onClick={() => void removeProduct(p.id)} className="text-ink-muted underline hover:text-ink">Delete</button>
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={saveProduct} className="mt-4 flex max-w-xl flex-col gap-3">
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
        </form>
      </div>

      {msg && <p className="mt-3 text-sm text-ink" role="status">{msg}</p>}
      <div className="mt-5"><FeedbackButton contactEmail={contactEmail} /></div>
    </section>
  );
}
