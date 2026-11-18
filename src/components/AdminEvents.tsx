"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Staff review of posted events and event photos (supabase/event_submissions.sql). Approving an event or photo copies its pictures from the
// private upload bucket to the public one; the staff-only policies in the database keep everyone else out.
type Sub = {
  id: string; created_at: string; name: string; start_date: string; end_date: string | null; city: string; country: string; continent: string | null; venue: string | null;
  lat: number | null; lng: number | null; organizer: string | null; url: string; description: string | null; contact_email: string | null; images: string[];
};
type Photo = { id: string; created_at: string; event_id: string; path: string; caption: string | null; year: number | null; credit: string | null };
const CONTINENTS = ["North America", "South America", "Europe", "Asia", "Oceania", "Africa"];
const field = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-2 py-1.5 text-sm text-ink focus:border-matcha focus:outline-none";

async function copyToMedia(from: string, to: string): Promise<boolean> {
  const sb = supabase();
  const dl = await sb.storage.from("event-uploads").download(from);
  if (dl.error || !dl.data) return false;
  const up = await sb.storage.from("event-media").upload(to, dl.data, { contentType: "image/jpeg", upsert: false });
  return !up.error;
}

function Thumbs({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (paths.length === 0) return;
    supabase().storage.from("event-uploads").createSignedUrls(paths, 3600).then(({ data }) => live && setUrls((data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[]));
    return () => { live = false; };
  }, [paths]);
  if (paths.length === 0) return <p className="text-xs text-ink-faint">No pictures.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, staff only */}
          <img src={u} alt="Submitted picture" className="h-24 w-24 rounded-sm border border-line object-cover" />
        </a>
      ))}
    </div>
  );
}

function SubCard({ s, onDone }: { s: Sub; onDone: () => void }) {
  const [f, setF] = useState({ ...s, lat: s.lat, lng: s.lng, continent: s.continent ?? "" });
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | number | null) => setF((o) => ({ ...o, [k]: v }));

  const lookup = async () => {
    setMsg(null);
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return setMsg("No map token here.");
    const q = [f.venue, f.city, f.country].filter(Boolean).join(", ");
    const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${token}`);
    const j = (await r.json()) as { features?: { center: [number, number]; place_name: string }[] };
    const hit = j.features?.[0] ?? (await (await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${f.city}, ${f.country}`)}.json?limit=1&access_token=${token}`)).json() as { features?: { center: [number, number]; place_name: string }[] }).features?.[0];
    if (!hit) return setMsg("Couldn't find that place.");
    setF((o) => ({ ...o, lng: hit.center[0], lat: hit.center[1] }));
    setMsg(`Found: ${hit.place_name}`);
  };

  const approve = async () => {
    setMsg(null);
    if (f.lat == null || f.lng == null || !f.continent) return setMsg("Look up the place and choose a continent first.");
    setBusy(true);
    const media: string[] = [];
    for (const p of s.images) {
      const to = `events/${s.id}/${crypto.randomUUID()}.jpg`;
      if (await copyToMedia(p, to)) media.push(to);
    }
    if (media.length < s.images.length) { setBusy(false); return setMsg("A picture didn't copy. Try again."); }
    const { error } = await supabase().from("event_submissions").update({
      status: "approved", approved_at: new Date().toISOString(), name: f.name, start_date: f.start_date, end_date: f.end_date, city: f.city, country: f.country, continent: f.continent,
      venue: f.venue, lat: f.lat, lng: f.lng, organizer: f.organizer, url: f.url, description: f.description, images: media,
    }).eq("id", s.id);
    setBusy(false);
    if (error) return setMsg("Couldn't save: " + error.message);
    if (s.images.length) await supabase().storage.from("event-uploads").remove(s.images).catch(() => {});
    onDone();
  };

  const reject = async () => {
    setBusy(true);
    const { error } = await supabase().from("event_submissions").update({ status: "rejected", admin_note: note || null }).eq("id", s.id);
    setBusy(false);
    if (error) return setMsg("Couldn't save: " + error.message);
    if (s.images.length) await supabase().storage.from("event-uploads").remove(s.images).catch(() => {});
    onDone();
  };

  return (
    <li className="rounded-sm border border-line bg-paper-raised p-4">
      <p className="text-xs text-ink-faint">Sent {new Date(s.created_at).toLocaleString()} · {s.contact_email ?? "no email"}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-ink-faint sm:col-span-2">Name<input value={f.name} onChange={(e) => set("name", e.target.value)} className={field} /></label>
        <label className="text-xs text-ink-faint">Starts<input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} className={field} /></label>
        <label className="text-xs text-ink-faint">Ends<input type="date" value={f.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} className={field} /></label>
        <label className="text-xs text-ink-faint">City<input value={f.city} onChange={(e) => set("city", e.target.value)} className={field} /></label>
        <label className="text-xs text-ink-faint">Country<input value={f.country} onChange={(e) => set("country", e.target.value)} className={field} /></label>
        <label className="text-xs text-ink-faint">Venue<input value={f.venue ?? ""} onChange={(e) => set("venue", e.target.value || null)} className={field} /></label>
        <label className="text-xs text-ink-faint">Organizer<input value={f.organizer ?? ""} onChange={(e) => set("organizer", e.target.value || null)} className={field} /></label>
        <label className="text-xs text-ink-faint sm:col-span-2">Link (open it and check the date matches) <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-matcha underline">open</a><input value={f.url} onChange={(e) => set("url", e.target.value)} className={field} /></label>
        <label className="text-xs text-ink-faint sm:col-span-2">Description<textarea rows={3} value={f.description ?? ""} onChange={(e) => set("description", e.target.value || null)} className={field} /></label>
        <label className="text-xs text-ink-faint">Continent
          <select value={f.continent} onChange={(e) => set("continent", e.target.value)} className={field}>
            <option value="">Choose…</option>
            {CONTINENTS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2 text-xs text-ink-faint">
          <button type="button" onClick={() => void lookup()} className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-matcha-soft">Look up place</button>
          <span className="tabular-nums">{f.lat != null && f.lng != null ? `${f.lat.toFixed(3)}, ${f.lng.toFixed(3)}` : "no coordinates yet"}</span>
        </div>
      </div>
      <div className="mt-3"><Thumbs paths={s.images} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void approve()} className="rounded-full bg-matcha px-4 py-1.5 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">Approve and publish</button>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason if rejecting (kept private)" className="min-w-[12rem] flex-1 rounded-sm border border-line-strong bg-paper px-2 py-1.5 text-sm" />
        <button type="button" disabled={busy} onClick={() => void reject()} className="rounded-full border border-red-700 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
      </div>
      {msg && <p className="mt-2 text-sm text-ink-muted" role="status">{msg}</p>}
    </li>
  );
}

function PhotoCard({ p, onDone }: { p: Photo; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const approve = async () => {
    setBusy(true);
    const to = `photos/${p.event_id}/${crypto.randomUUID()}.jpg`;
    if (!(await copyToMedia(p.path, to))) { setBusy(false); return setMsg("The picture didn't copy. Try again."); }
    const { error } = await supabase().from("event_photos").update({ status: "approved", path: to }).eq("id", p.id);
    setBusy(false);
    if (error) return setMsg("Couldn't save: " + error.message);
    await supabase().storage.from("event-uploads").remove([p.path]).catch(() => {});
    onDone();
  };
  const reject = async () => {
    setBusy(true);
    const { error } = await supabase().from("event_photos").update({ status: "rejected" }).eq("id", p.id);
    setBusy(false);
    if (error) return setMsg("Couldn't save: " + error.message);
    await supabase().storage.from("event-uploads").remove([p.path]).catch(() => {});
    onDone();
  };
  return (
    <li className="flex flex-wrap items-start gap-4 rounded-sm border border-line bg-paper-raised p-4">
      <Thumbs paths={[p.path]} />
      <div className="min-w-0 flex-1 text-sm text-ink-muted">
        <p>For <a href={`/events/${p.event_id}`} target="_blank" rel="noopener noreferrer" className="text-matcha underline">{p.event_id}</a>{p.year ? ` · ${p.year}` : ""}</p>
        {p.caption && <p>Caption: {p.caption}</p>}
        {p.credit && <p>Credit: {p.credit}</p>}
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy} onClick={() => void approve()} className="rounded-full bg-matcha px-4 py-1.5 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">Approve</button>
          <button type="button" disabled={busy} onClick={() => void reject()} className="rounded-full border border-red-700 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
        </div>
        {msg && <p className="mt-1 text-xs">{msg}</p>}
      </div>
    </li>
  );
}

export function AdminEvents() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const load = useCallback(async () => {
    const sb = supabase();
    const [a, b] = await Promise.all([
      sb.from("event_submissions").select("*").eq("status", "pending").order("created_at"),
      sb.from("event_photos").select("*").eq("status", "pending").order("created_at"),
    ]);
    setSubs((a.data ?? []) as Sub[]);
    setPhotos((b.data ?? []) as Photo[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <section className="mt-4 flex flex-col gap-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Posted events waiting for review {subs ? `(${subs.length})` : ""}</h2>
        <p className="text-sm text-ink-faint">Open the link and check the date and place. Then look up the place, choose the continent, and approve.</p>
        {subs === null ? <p className="mt-3 text-sm text-ink-faint">Loading…</p> : subs.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Nothing waiting.</p> : <ul className="mt-3 flex flex-col gap-4">{subs.map((s) => <SubCard key={s.id} s={s} onDone={() => void load()} />)}</ul>}
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Event photos waiting for review {photos ? `(${photos.length})` : ""}</h2>
        {photos === null ? <p className="mt-3 text-sm text-ink-faint">Loading…</p> : photos.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Nothing waiting.</p> : <ul className="mt-3 flex flex-col gap-4">{photos.map((p) => <PhotoCard key={p.id} p={p} onDone={() => void load()} />)}</ul>}
      </div>
    </section>
  );
}
