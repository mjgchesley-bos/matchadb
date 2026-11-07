"use client";

import Link from "@/i18n/Link";
import { useEffect, useRef, useState } from "react";
import { AVATARS, AVATAR_LABELS, Avatar, type AvatarKey } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { HOW_LABELS } from "@/lib/badges";
import { supabase } from "@/lib/supabase";

// My matcha: choose whether the profile is public, plus avatar (an icon or your own photo), bio and
// how you drink it. Nothing is public until "public profile" is switched on.
type Settings = { is_public: boolean; bio: string; avatar: string | null; avatar_path: string | null; how_i_drink: string | null };

const BUCKET = "avatars";

// A centered square crop, shrunk to at most 512 px and re-encoded as JPEG (which also drops hidden
// metadata such as GPS location).
async function squarePhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  bmp.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85));
}

export function PublicProfileSettings() {
  const { user, displayName, setPublic, setAvatar } = useAuth();
  const uid = user?.id ?? null;
  const [loaded, setLoaded] = useState<{ uid: string; s: Settings } | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pending = useRef<string | null>(null); // a photo uploaded but not saved yet
  const picker = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("profiles")
      .select("is_public, bio, avatar, avatar_path, how_i_drink")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => live && data && setLoaded({ uid, s: data as Settings }));
    return () => {
      live = false;
    };
  }, [uid]);

  const base = loaded && loaded.uid === uid ? loaded.s : null;
  const s = draft ?? base;
  if (!user || !s) return null;
  const set = (patch: Partial<Settings>) => {
    setDraft({ ...s, ...patch });
    setMsg(null);
  };

  const dropPending = async () => {
    if (pending.current) {
      await supabase().storage.from(BUCKET).remove([pending.current]);
      pending.current = null;
    }
  };

  const chooseIcon = async (k: AvatarKey | null) => {
    await dropPending();
    set({ avatar: k, avatar_path: null });
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setMsg("Please choose a JPG, PNG or WebP photo.");
    setUploading(true);
    setMsg(null);
    try {
      const blob = await squarePhoto(file);
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase().storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      await dropPending();
      pending.current = path;
      set({ avatar: null, avatar_path: path });
    } catch {
      setMsg("Couldn't use that photo. Try a different one.");
    }
    setUploading(false);
    if (picker.current) picker.current.value = "";
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase()
      .from("profiles")
      .update({ is_public: s.is_public, bio: s.bio.trim(), avatar: s.avatar, avatar_path: s.avatar_path, how_i_drink: s.how_i_drink })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setMsg(error.message.includes("bio") ? "Your bio can't contain links or website names." : "Couldn't save. Please try again.");
      return;
    }
    // The photo replaced or removed here is no longer needed.
    if (base?.avatar_path && base.avatar_path !== s.avatar_path) await supabase().storage.from(BUCKET).remove([base.avatar_path]);
    pending.current = null;
    setLoaded({ uid: user.id, s: { ...s, bio: s.bio.trim() } });
    setDraft(null);
    setPublic(s.is_public);
    setAvatar(s.avatar, s.avatar_path);
    if (s.is_public) window.gtag?.("event", "profile_public");
    setMsg("Saved.");
  };

  const field = "w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha";
  const label = "block text-sm font-medium text-ink";
  const ring = (on: boolean) => `rounded-full p-0.5 ${on ? "ring-2 ring-matcha" : "ring-1 ring-line"}`;

  return (
    <section aria-labelledby="pp-h">
      <h2 id="pp-h" className="font-display text-xl font-semibold text-ink">
        Public profile
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Private by default. Switch it on to get a page anyone can visit, showing your username, medal, what you&apos;re using now, your top ratings, lists, saved brands, favorite cafés, reviews and photos. Your email is never shown.
      </p>

      <label className="mt-4 flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={s.is_public} onChange={(e) => set({ is_public: e.target.checked })} className="accent-matcha" />
        Make my profile public
      </label>
      {s.is_public && base?.is_public && displayName && (
        <p className="mt-2 text-sm">
          <Link href={`/u/${encodeURIComponent(displayName)}`} className="text-matcha underline hover:text-forest">
            View your public profile
          </Link>
        </p>
      )}

      <div className="mt-5">
        <span className={label}>Avatar</span>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Avatar">
          {s.avatar_path && (
            <button type="button" role="radio" aria-checked aria-label="Your photo" title="Your photo" className={ring(true)}>
              <Avatar photoPath={s.avatar_path} name={displayName} size={40} />
            </button>
          )}
          <button type="button" role="radio" aria-checked={!s.avatar_path && s.avatar === null} aria-label="Use my first letter" onClick={() => void chooseIcon(null)} className={ring(!s.avatar_path && s.avatar === null)}>
            <Avatar avatar={null} name={displayName} size={40} />
          </button>
          {AVATARS.map((a: AvatarKey) => (
            <button key={a} type="button" role="radio" aria-checked={!s.avatar_path && s.avatar === a} aria-label={AVATAR_LABELS[a]} title={AVATAR_LABELS[a]} onClick={() => void chooseIcon(a)} className={ring(!s.avatar_path && s.avatar === a)}>
              <Avatar avatar={a} size={40} />
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={picker} id="avatar-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
          <label htmlFor="avatar-photo" className={`cursor-pointer rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm text-ink hover:bg-matcha-soft ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? "Uploading…" : s.avatar_path ? "Upload a different photo" : "Upload a photo"}
          </label>
          {s.avatar_path && (
            <button type="button" onClick={() => void chooseIcon(null)} className="text-sm text-ink-muted underline hover:text-ink">
              Remove photo
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">Photos are cropped to a square and shown on your public profile. Please use a photo of your own that you&apos;re happy to share.</p>
      </div>

      <div className="mt-5 max-w-sm">
        <label htmlFor="pp-how" className={label}>
          How I drink it
        </label>
        <select id="pp-how" value={s.how_i_drink ?? ""} onChange={(e) => set({ how_i_drink: e.target.value || null })} className={`mt-1.5 ${field}`}>
          <option value="">Not set</option>
          {Object.entries(HOW_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="pp-bio" className={label}>
          Bio
        </label>
        <textarea id="pp-bio" value={s.bio} onChange={(e) => set({ bio: e.target.value.slice(0, 140) })} rows={2} placeholder="A line about you and matcha (no links)" className={`mt-1.5 ${field}`} />
        <p className="mt-1 text-xs text-ink-faint tabular-nums">{s.bio.length}/140</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving || uploading || !draft} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
          Save profile settings
        </button>
        {msg && (
          <span className="text-sm text-ink-muted" aria-live="polite">
            {msg}
          </span>
        )}
      </div>
    </section>
  );
}
