"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { OK_IMAGE, shrinkImage } from "@/lib/image-upload";
import { supabase } from "@/lib/supabase";

// Add photos or a flyer to an event's page, including ones from past years. They wait for review before they show.
const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";

export function EventPhotoForm({ eventId }: { eventId: string }) {
  const { user, ready, signIn } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [year, setYear] = useState("");
  const [credit, setCredit] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!ready) return null;
  if (!user) return <button type="button" onClick={() => signIn("Sign in to add photos to this event.")} className="rounded-full border border-matcha px-5 py-2 text-sm font-medium text-matcha hover:bg-matcha-soft">Sign in to add photos</button>;
  if (done) return <p className="rounded-sm border border-matcha bg-matcha-soft px-4 py-3 text-sm text-ink" role="status">Thank you. Your pictures are with us for review and will appear here once approved.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (files.length === 0) return setMsg("Choose at least one picture.");
    if (!rights) return setMsg("Please confirm you may share these pictures.");
    const y = year.trim() ? Number(year) : null;
    if (y != null && (!Number.isInteger(y) || y < 1990 || y > 2100)) return setMsg("The year should be four digits, like 2024.");
    setBusy(true);
    try {
      const sb = supabase();
      for (const file of files) {
        const blob = await shrinkImage(file);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from("event-uploads").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
        const { error } = await sb.from("event_photos").insert({ event_id: eventId, path, caption: caption.trim() || null, year: y, credit: credit.trim() || null, rights_ok: true });
        if (error) {
          await sb.storage.from("event-uploads").remove([path]).catch(() => {});
          throw error;
        }
      }
      setDone(true);
    } catch (err) {
      const m = (err as { message?: string })?.message ?? "";
      setMsg(m.includes("daily limit") ? "You have added the most pictures we allow in a day. Try again tomorrow." : "That didn't go through. Please try again.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Pictures" onChange={(e) => setFiles([...(e.target.files ?? [])].filter((x) => OK_IMAGE.test(x.type)).slice(0, 3))} className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-paper-raised file:px-4 file:py-1.5 file:text-sm file:text-ink hover:file:bg-matcha-soft" />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-ink-muted sm:col-span-2">Caption (optional)<input maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} className={input} /></label>
        <label className="block text-sm text-ink-muted">Year taken (optional)<input inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} className={input} /></label>
        <label className="block text-sm text-ink-muted sm:col-span-3">Photo credit (optional, shown under the picture)<input maxLength={120} value={credit} onChange={(e) => setCredit(e.target.value)} className={input} /></label>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={rights} onChange={(e) => { setRights(e.target.checked); setMsg(null); }} className="mt-0.5 h-4 w-4 accent-matcha" />
        I took these pictures or have permission to share them, and I agree MatchaDB may show them on this event&apos;s page.
      </label>
      {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
      <div><button type="submit" disabled={busy} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{busy ? "Uploading…" : "Send for review"}</button></div>
    </form>
  );
}
