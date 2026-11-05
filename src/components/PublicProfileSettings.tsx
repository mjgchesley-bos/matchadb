"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AVATARS, AVATAR_LABELS, Avatar, type AvatarKey } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { HOW_LABELS } from "@/lib/badges";
import { supabase } from "@/lib/supabase";

// My matcha: choose whether the profile is public, plus avatar, bio, how you drink it and a
// tasting-challenge goal. Nothing is public until "public profile" is switched on.
type Settings = { is_public: boolean; bio: string; avatar: string | null; how_i_drink: string | null; challenge_goal: number | null };

export function PublicProfileSettings() {
  const { user, displayName, setPublic } = useAuth();
  const uid = user?.id ?? null;
  const [loaded, setLoaded] = useState<{ uid: string; s: Settings } | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("profiles")
      .select("is_public, bio, avatar, how_i_drink, challenge_goal")
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

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const goal = s.challenge_goal && s.challenge_goal > 0 ? Math.min(365, Math.round(s.challenge_goal)) : null;
    const { error } = await supabase()
      .from("profiles")
      .update({ is_public: s.is_public, bio: s.bio.trim(), avatar: s.avatar, how_i_drink: s.how_i_drink, challenge_goal: goal })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setMsg(error.message.includes("bio") ? "Your bio can't contain links or website names." : "Couldn't save. Please try again.");
      return;
    }
    setLoaded({ uid: user.id, s: { ...s, bio: s.bio.trim(), challenge_goal: goal } });
    setDraft(null);
    setPublic(s.is_public);
    if (s.is_public) window.gtag?.("event", "profile_public");
    setMsg("Saved.");
  };

  const field = "w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha";
  const label = "block text-sm font-medium text-ink";

  return (
    <section aria-labelledby="pp-h">
      <h2 id="pp-h" className="font-display text-xl font-semibold text-ink">
        Public profile
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Private by default. Switch it on to get a page anyone can visit, showing your username, medal, what you&apos;re using now, your top ratings, lists, saved brands, reviews and photos. Your email is never shown.
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
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">
          <button
            type="button"
            role="radio"
            aria-checked={s.avatar === null}
            aria-label="Use my first letter"
            onClick={() => set({ avatar: null })}
            className={`rounded-full p-0.5 ${s.avatar === null ? "ring-2 ring-matcha" : "ring-1 ring-line"}`}
          >
            <Avatar avatar={null} name={displayName} size={40} />
          </button>
          {AVATARS.map((a: AvatarKey) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={s.avatar === a}
              aria-label={AVATAR_LABELS[a]}
              title={AVATAR_LABELS[a]}
              onClick={() => set({ avatar: a })}
              className={`rounded-full p-0.5 ${s.avatar === a ? "ring-2 ring-matcha" : "ring-1 ring-line"}`}
            >
              <Avatar avatar={a} size={40} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
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
        <div>
          <label htmlFor="pp-goal" className={label}>
            Tasting challenge: new matchas to try this year
          </label>
          <input
            id="pp-goal"
            type="number"
            min={1}
            max={365}
            value={s.challenge_goal ?? ""}
            onChange={(e) => set({ challenge_goal: e.target.value ? Number(e.target.value) : null })}
            placeholder="For example 12"
            className={`mt-1.5 ${field}`}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="pp-bio" className={label}>
          Bio
        </label>
        <textarea id="pp-bio" value={s.bio} onChange={(e) => set({ bio: e.target.value.slice(0, 140) })} rows={2} placeholder="A line about you and matcha (no links)" className={`mt-1.5 ${field}`} />
        <p className="mt-1 text-xs text-ink-faint tabular-nums">{s.bio.length}/140</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving || !draft} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
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
