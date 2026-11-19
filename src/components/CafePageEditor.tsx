"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CafeMenuManager } from "@/components/CafeMenuManager";
import { SocialIcons } from "@/components/SocialIcons";
import { OK_IMAGE, shrinkImage } from "@/lib/image-upload";
import { supabase } from "@/lib/supabase";
import { ACCENTS, AMENITIES, DAYS, NETWORKS, accentStyle, cafeMediaUrl, type AccentKey, type OwnerMenuFile, type OwnerPage, type OwnerPhoto } from "@/lib/cafe-owner-page";

// The café owner's editor: a verified owner customises their café's page like a small landing page. Everything saved here appears on the café's public
// page (supabase/cafe_pages.sql); pictures and menu files go to the public cafe-media bucket in the café's own folder.
type Owned = { id: string; name: string; city: string; slug: string };
const box = "rounded-sm border-2 border-line bg-paper-raised p-5";
const h2 = "font-mono text-xs uppercase tracking-[0.2em] text-forest";
const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
const lbl = "block text-sm text-ink-muted";
const BLANK = (id: string): OwnerPage => ({ cafe_id: id, tagline: null, bio: null, matcha_info: null, announcement: null, cover_path: null, accent: "green", hours: {}, phone: null, public_email: null, website_url: null, order_url: null, reservation_url: null, links: {}, amenities: [] });

export function CafePageEditor() {
  const { user, ready, signIn } = useAuth();
  const [owned, setOwned] = useState<Owned[] | null>(null);
  const [cafe, setCafe] = useState<Owned | null>(null);
  const [page, setPage] = useState<OwnerPage | null>(null);
  const [photos, setPhotos] = useState<OwnerPhoto[]>([]);
  const [files, setFiles] = useState<OwnerMenuFile[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [menuLabel, setMenuLabel] = useState("Menu");
  const uid = user?.id ?? null;

  useEffect(() => {
    if (!uid) return;
    let live = true;
    (async () => {
      const { data } = await supabase().from("cafe_owners").select("cafe_id");
      const ids = ((data ?? []) as { cafe_id: string }[]).map((r) => r.cafe_id);
      if (!ids.length) return live && setOwned([]);
      const info = (await fetch(`/api/cafes/lookup?ids=${ids.join(",")}`).then((r) => r.json()).catch(() => [])) as { id: string; name: string; city: string; slug: string }[];
      const list = ids.map((id) => info.find((x) => x.id === id) ?? { id, name: "Your café", city: "", slug: "" });
      if (live) {
        setOwned(list);
        setCafe(list[0]);
      }
    })();
    return () => { live = false; };
  }, [uid]);

  const load = useCallback(async (id: string) => {
    const sb = supabase();
    const [p, ph, mf] = await Promise.all([
      sb.from("cafe_pages").select("*").eq("cafe_id", id).maybeSingle(),
      sb.from("cafe_photos").select("id, path, caption, sort").eq("cafe_id", id).order("sort").order("created_at"),
      sb.from("cafe_menu_files").select("id, path, label, kind, sort").eq("cafe_id", id).order("sort").order("created_at"),
    ]);
    setPage((p.data as OwnerPage | null) ?? BLANK(id));
    setPhotos((ph.data ?? []) as OwnerPhoto[]);
    setFiles((mf.data ?? []) as OwnerMenuFile[]);
    setDirty(false);
  }, []);
  useEffect(() => { if (cafe) void load(cafe.id); }, [cafe, load]);

  if (!ready) return null;
  if (!user) return <button type="button" onClick={() => signIn("Sign in to edit your café page.")} className="rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest">Sign in</button>;
  if (owned === null) return <p className="text-sm text-ink-faint">Loading…</p>;
  if (owned.length === 0) {
    return (
      <p className="rounded-sm border-2 border-line bg-paper-raised p-5 text-ink-muted">
        This page is for approved café owners. If you own a café, ask for owner access from <Link href="/account" className="text-matcha underline">your account page</Link> (choose &ldquo;I own a café&rdquo;).
      </p>
    );
  }
  if (!cafe || !page) return <p className="text-sm text-ink-faint">Loading…</p>;
  const set = <K extends keyof OwnerPage>(k: K, v: OwnerPage[K]) => { setPage((p) => (p ? { ...p, [k]: v } : p)); setDirty(true); setMsg(null); };
  const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

  const revalidate = async () => {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) await fetch("/api/revalidate-cafe", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ cafeId: cafe.id }) }).catch(() => {});
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const https = /^https:\/\/\S+$/;
    for (const [k, v] of [["Website", page.website_url], ["Order link", page.order_url], ["Reservation link", page.reservation_url], ...Object.entries(page.links)] as [string, string | null][]) {
      if (v && v.trim() && !https.test(v.trim())) { setBusy(false); return setMsg(`${k}: the link must start with https://`); }
    }
    const links: Record<string, string> = {};
    for (const [k, v] of Object.entries(page.links)) if (v && v.trim()) links[k] = v.trim();
    const hours: Record<string, string> = {};
    for (const [k, v] of Object.entries(page.hours)) if (v && v.trim()) hours[k] = v.trim().slice(0, 40);
    const row = {
      cafe_id: cafe.id, tagline: clean(page.tagline), bio: clean(page.bio), matcha_info: clean(page.matcha_info), announcement: clean(page.announcement), cover_path: page.cover_path,
      accent: page.accent, hours, phone: clean(page.phone), public_email: clean(page.public_email), website_url: clean(page.website_url), order_url: clean(page.order_url),
      reservation_url: clean(page.reservation_url), links, amenities: page.amenities,
    };
    const { error } = await supabase().from("cafe_pages").upsert(row, { onConflict: "cafe_id" });
    if (error) {
      setBusy(false);
      return setMsg(error.message.includes("check") || error.message.includes("links") ? "Something in the form isn't valid (check emails and links)." : "That didn't save. Please try again.");
    }
    await revalidate();
    setBusy(false);
    setDirty(false);
    setMsg("Saved. Your page is live.");
  };

  const upload = async (file: File, kind: "image" | "pdf"): Promise<string | null> => {
    if (kind === "pdf") {
      if (file.type !== "application/pdf") { setMsg("Menu files must be a PDF or a picture."); return null; }
      if (file.size > 8 * 1024 * 1024) { setMsg("That PDF is over 8 MB. Try a smaller one."); return null; }
    } else if (!OK_IMAGE.test(file.type)) { setMsg("Use a JPEG, PNG or WebP picture."); return null; }
    const body = kind === "pdf" ? file : await shrinkImage(file, 1800);
    const path = `${cafe.id}/${crypto.randomUUID()}.${kind === "pdf" ? "pdf" : "jpg"}`;
    const { error } = await supabase().storage.from("cafe-media").upload(path, body, { contentType: kind === "pdf" ? "application/pdf" : "image/jpeg", upsert: false });
    if (error) { setMsg("The upload didn't go through. Try a smaller file."); return null; }
    return path;
  };

  const setCover = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const path = await upload(file, "image");
    if (path) {
      const old = page.cover_path;
      const { error } = await supabase().from("cafe_pages").upsert({ cafe_id: cafe.id, cover_path: path }, { onConflict: "cafe_id" });
      if (!error) {
        setPage({ ...page, cover_path: path });
        if (old) await supabase().storage.from("cafe-media").remove([old]).catch(() => {});
        await revalidate();
      }
    }
    setBusy(false);
  };

  const addPhotos = async (list: FileList | null) => {
    if (!list || !list.length) return;
    setBusy(true);
    setMsg(null);
    for (const file of [...list].slice(0, 16 - photos.length)) {
      const path = await upload(file, "image");
      if (!path) break;
      const { data, error } = await supabase().from("cafe_photos").insert({ cafe_id: cafe.id, path, sort: photos.length }).select("id, path, caption, sort").single();
      if (error || !data) { await supabase().storage.from("cafe-media").remove([path]).catch(() => {}); setMsg("You can add up to 16 photos."); break; }
      setPhotos((cur) => [...cur, data as OwnerPhoto]);
    }
    await revalidate();
    setBusy(false);
  };
  const delPhoto = async (p: OwnerPhoto) => {
    await supabase().from("cafe_photos").delete().eq("id", p.id);
    await supabase().storage.from("cafe-media").remove([p.path]).catch(() => {});
    setPhotos((cur) => cur.filter((x) => x.id !== p.id));
    await revalidate();
  };
  const captionPhoto = async (p: OwnerPhoto, caption: string) => {
    setPhotos((cur) => cur.map((x) => (x.id === p.id ? { ...x, caption } : x)));
  };
  const saveCaption = async (p: OwnerPhoto) => {
    await supabase().from("cafe_photos").update({ caption: clean(p.caption) }).eq("id", p.id);
    await revalidate();
  };

  const addMenuFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const kind = file.type === "application/pdf" ? "pdf" : "image";
    const path = await upload(file, kind);
    if (path) {
      const { data, error } = await supabase().from("cafe_menu_files").insert({ cafe_id: cafe.id, path, label: menuLabel.trim() || "Menu", kind, sort: files.length }).select("id, path, label, kind, sort").single();
      if (error || !data) { await supabase().storage.from("cafe-media").remove([path]).catch(() => {}); setMsg("You can add up to 6 menu files."); }
      else { setFiles((cur) => [...cur, data as OwnerMenuFile]); setMenuLabel("Menu"); await revalidate(); }
    }
    setBusy(false);
  };
  const delFile = async (f: OwnerMenuFile) => {
    await supabase().from("cafe_menu_files").delete().eq("id", f.id);
    await supabase().storage.from("cafe-media").remove([f.path]).catch(() => {});
    setFiles((cur) => cur.filter((x) => x.id !== f.id));
    await revalidate();
  };

  return (
    <div style={accentStyle(page.accent)} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {owned.length > 1 ? (
            <select value={cafe.id} onChange={(e) => setCafe(owned.find((o) => o.id === e.target.value) ?? cafe)} className="rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm">
              {owned.map((o) => <option key={o.id} value={o.id}>{o.name}{o.city ? `, ${o.city}` : ""}</option>)}
            </select>
          ) : (
            <p className="font-display text-xl font-semibold text-ink">{cafe.name}{cafe.city ? <span className="text-ink-muted">, {cafe.city}</span> : null}</p>
          )}
        </div>
        {cafe.slug && <Link href={`/cafes/${cafe.slug}`} className="rounded-full border border-matcha px-5 py-2 text-sm font-medium text-matcha hover:bg-matcha-soft">View your live page</Link>}
      </div>

      <section className={box} aria-labelledby="cv-h">
        <h2 id="cv-h" className={h2}>Cover photo</h2>
        <p className="mt-1 text-sm text-ink-muted">The big picture at the top of your page. Wide photos (about 3:1) look best.</p>
        {page.cover_path && (
          // eslint-disable-next-line @next/next/no-img-element -- owner cover photo
          <img src={cafeMediaUrl(page.cover_path)} alt="Your cover" className="mt-3 h-40 w-full rounded-sm border border-line object-cover sm:h-56" />
        )}
        <label className={`mt-3 inline-block cursor-pointer rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink hover:bg-matcha-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {page.cover_path ? "Change cover photo" : "Upload a cover photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void setCover(e.target.files?.[0])} />
        </label>
      </section>

      <section className={box} aria-labelledby="ab-h">
        <h2 id="ab-h" className={h2}>About your café</h2>
        <label className={lbl}>Tagline (one line under your name)<input maxLength={140} value={page.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Ceremonial matcha, made to order" className={input} /></label>
        <label className={`${lbl} mt-3`}>Your story (up to 2,500 characters)<textarea rows={6} maxLength={2500} value={page.bio ?? ""} onChange={(e) => set("bio", e.target.value)} className={input} /></label>
        <label className={`${lbl} mt-3`}>The matcha you use: farm, region, grade (optional)<textarea rows={3} maxLength={800} value={page.matcha_info ?? ""} onChange={(e) => set("matcha_info", e.target.value)} placeholder="Ceremonial grade from Uji, Kyoto, whisked to order" className={input} /></label>
        <label className={`${lbl} mt-3`}>Announcement banner (a special, new hours, an event; leave empty for none)<input maxLength={240} value={page.announcement ?? ""} onChange={(e) => set("announcement", e.target.value)} className={input} /></label>
        <p className={`${lbl} mt-4`}>Colour theme</p>
        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour theme">
          {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={page.accent === k} onClick={() => set("accent", k)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${page.accent === k ? "border-ink bg-paper font-medium text-ink" : "border-line-strong bg-paper text-ink-muted hover:bg-matcha-soft"}`}>
              <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ background: ACCENTS[k].matcha }} />
              {ACCENTS[k].label}
            </button>
          ))}
        </div>
      </section>

      <section className={box} aria-labelledby="hr-h">
        <h2 id="hr-h" className={h2}>Hours and contact</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {DAYS.map(([k, name]) => (
            <label key={k} className={lbl}>{name}<input maxLength={40} value={page.hours[k] ?? ""} onChange={(e) => set("hours", { ...page.hours, [k]: e.target.value })} placeholder="8am to 4pm, or Closed" className={input} /></label>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={lbl}>Phone<input maxLength={40} value={page.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={input} /></label>
          <label className={lbl}>Public email (shown on your page)<input type="email" maxLength={120} value={page.public_email ?? ""} onChange={(e) => set("public_email", e.target.value)} className={input} /></label>
        </div>
      </section>

      <section className={box} aria-labelledby="ln-h">
        <h2 id="ln-h" className={h2}>Links and socials</h2>
        <p className="mt-1 text-sm text-ink-muted">Each link you add shows as its icon on your page. Links must start with https://</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className={lbl}>Your website<input maxLength={200} value={page.website_url ?? ""} onChange={(e) => set("website_url", e.target.value)} placeholder="https://" className={input} /></label>
          <label className={lbl}>Order online<input maxLength={200} value={page.order_url ?? ""} onChange={(e) => set("order_url", e.target.value)} placeholder="https://" className={input} /></label>
          <label className={lbl}>Reservations<input maxLength={200} value={page.reservation_url ?? ""} onChange={(e) => set("reservation_url", e.target.value)} placeholder="https://" className={input} /></label>
          {NETWORKS.map((n) => (
            <label key={n.key} className={lbl}>{n.label}<input maxLength={200} value={page.links[n.key] ?? ""} onChange={(e) => set("links", { ...page.links, [n.key]: e.target.value })} placeholder={n.ph} className={input} /></label>
          ))}
        </div>
        <div className="mt-4"><SocialIcons links={{ ...page.links, ...(page.website_url ? { website: page.website_url } : {}) }} /></div>
      </section>

      <section className={box} aria-labelledby="am-h">
        <h2 id="am-h" className={h2}>What you offer</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMENITIES.map((a) => {
            const on = page.amenities.includes(a);
            return (
              <button key={a} type="button" aria-pressed={on} onClick={() => set("amenities", on ? page.amenities.filter((x) => x !== a) : [...page.amenities, a].slice(0, 16))} className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-matcha bg-matcha-soft font-medium text-forest" : "border-line-strong bg-paper text-ink-muted hover:bg-matcha-soft"}`}>{a}</button>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-full border-2 border-line-strong bg-paper-raised px-5 py-3 shadow-md">
        <button type="button" disabled={busy || !dirty} onClick={() => void save()} className="rounded-full bg-matcha px-6 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
        <span className="text-sm text-ink-muted" role="status" aria-live="polite">{msg ?? (dirty ? "You have unsaved changes." : "Everything is saved.")}</span>
      </div>

      <section className={box} aria-labelledby="ph-h">
        <h2 id="ph-h" className={h2}>Photos of your café ({photos.length}/16)</h2>
        <p className="mt-1 text-sm text-ink-muted">Photos upload and appear on your page straight away.</p>
        {photos.length > 0 && (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- owner photo */}
                <img src={cafeMediaUrl(p.path)} alt={p.caption ?? "Café photo"} className="h-40 w-full rounded-sm border border-line object-cover" />
                <input value={p.caption ?? ""} maxLength={120} onChange={(e) => void captionPhoto(p, e.target.value)} onBlur={() => void saveCaption(p)} placeholder="Caption (optional)" className={input} />
                <button type="button" onClick={() => void delPhoto(p)} className="w-fit text-xs text-red-700 underline">Remove</button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < 16 && (
          <label className={`mt-3 inline-block cursor-pointer rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink hover:bg-matcha-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
            Add photos
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void addPhotos(e.target.files)} />
          </label>
        )}
      </section>

      <section className={box} aria-labelledby="mn-h">
        <h2 id="mn-h" className={h2}>Menu</h2>
        <p className="mt-1 text-sm text-ink-muted">Upload your menu as a PDF or a picture (a page of the menu, or a photo of the board), and list your matcha drinks below so people can find them in search.</p>
        {files.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-sm border border-line">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <a href={cafeMediaUrl(f.path)} target="_blank" rel="noopener noreferrer" className="text-matcha underline">{f.label} ({f.kind === "pdf" ? "PDF" : "picture"})</a>
                <button type="button" onClick={() => void delFile(f)} className="text-xs text-red-700 underline">Remove</button>
              </li>
            ))}
          </ul>
        )}
        {files.length < 6 && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className={lbl}>Name of this file<input value={menuLabel} maxLength={60} onChange={(e) => setMenuLabel(e.target.value)} className={`${input} w-48`} /></label>
            <label className={`cursor-pointer rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink hover:bg-matcha-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
              Upload menu (PDF or picture)
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void addMenuFile(e.target.files?.[0])} />
            </label>
          </div>
        )}
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Your matcha drinks and prices</p>
          <CafeMenuManager cafeId={cafe.id} cafeName={cafe.name} />
        </div>
      </section>
    </div>
  );
}
