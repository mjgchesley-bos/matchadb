"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { OK_IMAGE, shrinkImage } from "@/lib/image-upload";
import { supabase } from "@/lib/supabase";
import { geocodeMany } from "@/lib/geo";
import { continentOf } from "@/lib/continent";

// "Post an event": a signed-in member sends a link, the details and up to four pictures (a flyer, photos from past years). It goes live at once
// (the place is looked up automatically); staff can hide anything afterwards. The member confirms they have the right to share the pictures.
const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
const label = "block text-sm text-ink-muted";

export function EventSubmitForm() {
  const { user, ready, signIn } = useAuth();
  const [f, setF] = useState({ name: "", start: "", end: "", city: "", country: "", venue: "", organizer: "", url: "", description: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<null | { live: boolean; id: string }>(null);
  const set = (k: keyof typeof f, v: string) => { setF((o) => ({ ...o, [k]: v })); setMsg(null); };

  if (!ready) return null;
  if (!user) {
    return (
      <div>
        <p className="text-sm text-ink-muted">Sign in to post an event. It keeps spam out, and lets us reach you if we have a question.</p>
        <button type="button" onClick={() => signIn("Sign in to post a matcha event.")} className="mt-3 rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest">Sign in</button>
      </div>
    );
  }
  if (done) {
    return (
      <p className="rounded-sm border border-matcha bg-matcha-soft px-4 py-3 text-sm text-ink" role="status">
        {done.live ? (
          <>Thank you. Your event is live. <a href={`/events/community-${done.id.slice(0, 8)}`} className="text-matcha underline hover:text-forest">See its page</a>.</>
        ) : (
          <>Thank you. We couldn&apos;t find that place on the map automatically, so we&apos;ll check it and publish your event shortly.</>
        )}
      </p>
    );
  }

  const pick = (list: FileList | null) => {
    const chosen = [...(list ?? [])].filter((x) => OK_IMAGE.test(x.type)).slice(0, 4);
    if (list && list.length && chosen.length === 0) setMsg("Pictures must be JPEG, PNG or WebP.");
    setFiles(chosen);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!/^https:\/\/\S+$/.test(f.url.trim())) return setMsg("The event link must start with https://");
    if (!f.start) return setMsg("Add the date the event starts.");
    if (f.end && f.end < f.start) return setMsg("The end date can't be before the start date.");
    if (!rights) return setMsg("Please confirm you may share the details and pictures.");
    setBusy(true);
    try {
      const sb = supabase();
      // Find the place on the map so the event can go live straight away (an unknown place falls back to a quick staff check).
      let place: { lat: number; lng: number; continent: string } | null = null;
      try {
        const hit = (await geocodeMany(`${f.city.trim()}, ${f.country.trim()}`, [], "en", 1))[0];
        const continent = continentOf(hit?.country);
        if (hit && continent) place = { lat: hit.lat, lng: hit.lng, continent };
      } catch {
        place = null;
      }
      const paths: string[] = [];
      for (const file of files) {
        const blob = await shrinkImage(file);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("event-media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        paths.push(path);
      }
      const { data: row, error } = await sb.from("event_submissions").insert({
        name: f.name.trim(), start_date: f.start, end_date: f.end || null, city: f.city.trim(), country: f.country.trim(),
        venue: f.venue.trim() || null, organizer: f.organizer.trim() || null, url: f.url.trim(), description: f.description.trim() || null,
        images: paths, rights_ok: true, ...(place ?? {}),
      }).select("id").single();
      if (error || !row) {
        if (paths.length) await sb.storage.from("event-media").remove(paths).catch(() => {});
        throw error;
      }
      window.gtag?.("event", "event_posted");
      setDone({ live: !!place, id: String(row.id) });
    } catch (err) {
      const m = (err as { code?: string; message?: string })?.message ?? "";
      setMsg(m.includes("daily limit") ? "You have posted the most events we allow in a day. Try again tomorrow." : "That didn't go through. Check the details and try again.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>Event name<input required minLength={3} maxLength={120} value={f.name} onChange={(e) => set("name", e.target.value)} className={input} /></label>
        <label className={label}>Starts<input required type="date" value={f.start} onChange={(e) => set("start", e.target.value)} className={input} /></label>
        <label className={label}>Ends (if more than one day)<input type="date" value={f.end} min={f.start || undefined} onChange={(e) => set("end", e.target.value)} className={input} /></label>
        <label className={label}>City<input required minLength={2} maxLength={80} value={f.city} onChange={(e) => set("city", e.target.value)} className={input} /></label>
        <label className={label}>Country<input required minLength={2} maxLength={60} value={f.country} onChange={(e) => set("country", e.target.value)} className={input} /></label>
        <label className={label}>Venue (optional)<input maxLength={160} value={f.venue} onChange={(e) => set("venue", e.target.value)} className={input} /></label>
        <label className={label}>Organizer (optional)<input maxLength={120} value={f.organizer} onChange={(e) => set("organizer", e.target.value)} className={input} /></label>
        <label className={`${label} sm:col-span-2`}>Link to the event page or tickets<input required type="url" placeholder="https://" maxLength={300} value={f.url} onChange={(e) => set("url", e.target.value)} className={input} /></label>
        <label className={`${label} sm:col-span-2`}>What is it? (optional, up to 1,500 characters)<textarea rows={4} maxLength={1500} value={f.description} onChange={(e) => set("description", e.target.value)} className={input} /></label>
      </div>
      <div>
        <label htmlFor="ev-files" className={label}>Flyer or photos, including from past years (optional, up to 4 pictures)</label>
        <input id="ev-files" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => pick(e.target.files)} className="mt-1 block w-full text-sm text-ink-muted file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-paper-raised file:px-4 file:py-1.5 file:text-sm file:text-ink hover:file:bg-matcha-soft" />
        {files.length > 0 && <p className="mt-1 text-xs text-ink-faint">{files.length} picture{files.length === 1 ? "" : "s"} chosen. They are shrunk and stripped of location data before they upload.</p>}
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={rights} onChange={(e) => { setRights(e.target.checked); setMsg(null); }} className="mt-0.5 h-4 w-4 accent-matcha" />
        I organize this event, or I have permission to share these details and pictures, and I agree MatchaDB may show them on the event&apos;s page.
      </label>
      {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
      <div>
        <button type="submit" disabled={busy} className="rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{busy ? "Sending…" : "Send for review"}</button>
      </div>
    </form>
  );
}
