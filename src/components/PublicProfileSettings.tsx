"use client";

import { useEffect, useRef, useState } from "react";
import { AVATARS, Avatar, type AvatarKey } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT, useTV } from "@/i18n/client";

// My matcha: choose whether the profile is public, plus avatar (an icon or your own photo), bio and
// how you drink it. Nothing is public until "public profile" is switched on.
type Settings = { is_public: boolean; find_by_contact: boolean; bio: string; avatar: string | null; avatar_path: string | null; how_i_drink: string | null };

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
  const t = useT();
  const tv = useTV();
  const { user, displayName, setAvatar } = useAuth();
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
      .select("is_public, find_by_contact, bio, avatar, avatar_path, how_i_drink")
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
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setMsg(t("c.pp.badType"));
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
      setMsg(t("c.pp.badPhoto"));
    }
    setUploading(false);
    if (picker.current) picker.current.value = "";
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase()
      .from("profiles")
      .update({ find_by_contact: s.find_by_contact, avatar: s.avatar, avatar_path: s.avatar_path })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setMsg(error.message.includes("bio") ? t("c.pp.bioLinks") : t("c.pp.saveFail"));
      return;
    }
    // The photo replaced or removed here is no longer needed.
    if (base?.avatar_path && base.avatar_path !== s.avatar_path) await supabase().storage.from(BUCKET).remove([base.avatar_path]);
    pending.current = null;
    setLoaded({ uid: user.id, s });
    setDraft(null);
    setAvatar(s.avatar, s.avatar_path);
    setMsg(t("c.acct.saved"));
  };

  const field = "w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha";
  const label = "block text-sm font-medium text-ink";
  const ring = (on: boolean) => `rounded-full p-0.5 ${on ? "ring-2 ring-matcha" : "ring-1 ring-line"}`;

  return (
    <section aria-labelledby="pp-h">
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={s.find_by_contact} onChange={(e) => set({ find_by_contact: e.target.checked })} className="mt-0.5 accent-matcha" />
        {t("c.pp.find")}
      </label>
      <div className="mt-5">
        <span className={label}>{t("c.pp.avatar")}</span>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("c.pp.avatar")}>
          {s.avatar_path && (
            <button type="button" role="radio" aria-checked aria-label={t("c.pp.yourPhoto")} title={t("c.pp.yourPhoto")} className={ring(true)}>
              <Avatar photoPath={s.avatar_path} name={displayName} size={40} />
            </button>
          )}
          <button type="button" role="radio" aria-checked={!s.avatar_path && s.avatar === null} aria-label={t("c.pp.letter")} onClick={() => void chooseIcon(null)} className={ring(!s.avatar_path && s.avatar === null)}>
            <Avatar avatar={null} name={displayName} size={40} />
          </button>
          {AVATARS.map((a: AvatarKey) => (
            <button key={a} type="button" role="radio" aria-checked={!s.avatar_path && s.avatar === a} aria-label={tv("avatar", a)} title={tv("avatar", a)} onClick={() => void chooseIcon(a)} className={ring(!s.avatar_path && s.avatar === a)}>
              <Avatar avatar={a} size={40} />
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={picker} id="avatar-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
          <label htmlFor="avatar-photo" className={`cursor-pointer rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm text-ink hover:bg-matcha-soft ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? t("c.pp.uploading") : s.avatar_path ? t("c.pp.uploadDiff") : t("c.pp.upload")}
          </label>
          {s.avatar_path && (
            <button type="button" onClick={() => void chooseIcon(null)} className="text-sm text-ink-muted underline hover:text-ink">
              {t("c.pp.removePhoto")}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">{t("c.pp.photoNote")}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving || uploading || !draft} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
          {t("c.pp.save")}
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
