"use client";

import Link from "@/i18n/Link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TierIcon } from "@/components/TierIcon";
import { supabase } from "@/lib/supabase";
import { useT, useTV } from "@/i18n/client";

// The top of My matcha: your name (click to change), a Public profile tick box beside it, your bio underneath, and your tier.
export function ProfileHeader() {
  const t = useT();
  const tv = useTV();
  const { user, displayName, isPublic, setPublic, setDisplayName, stats } = useAuth();
  const uid = user?.id ?? null;
  const [bio, setBio] = useState<{ uid: string; saved: string; draft: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase().from("profiles").select("bio").eq("id", uid).maybeSingle().then(({ data }) => live && setBio({ uid, saved: data?.bio ?? "", draft: data?.bio ?? "" }));
    return () => { live = false; };
  }, [uid]);

  if (!user) return null;
  const b = bio && bio.uid === uid ? bio : null;

  const togglePublic = async (v: boolean) => {
    setPublic(v);
    const { error } = await supabase().from("profiles").update({ is_public: v }).eq("id", user.id);
    if (error) setPublic(!v);
    else if (v) window.gtag?.("event", "profile_public");
  };

  const saveName = async () => {
    const next = name.trim();
    if (next.length < 2 || next.length > 30) return setMsg(t("c.auth.nameLen"));
    if (next === displayName) { setEditing(false); return; }
    const { error } = await supabase().from("profiles").update({ display_name: next }).eq("id", user.id);
    if (error) return setMsg(error.code === "23505" ? t("c.auth.nameTaken") : t("c.acct.nameFail"));
    setDisplayName(next);
    setEditing(false);
    setMsg(null);
  };

  const saveBio = async () => {
    if (!b) return;
    const next = b.draft.trim();
    const { error } = await supabase().from("profiles").update({ bio: next }).eq("id", user.id);
    if (error) return setMsg(error.message.includes("bio") ? t("c.pp.bioLinks") : t("c.pp.saveFail"));
    setBio({ uid: user.id, saved: next, draft: next });
    setMsg(t("c.acct.saved"));
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); void saveName(); }} className="flex items-center gap-2">
            <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setMsg(null); }} maxLength={30} aria-label={t("c.acct.username")} className="w-56 rounded-sm border border-line-strong bg-paper px-3 py-1.5 font-display text-2xl text-ink focus:outline-2 focus:outline-matcha" />
            <button type="submit" className="rounded-full bg-matcha px-4 py-1.5 text-sm font-medium text-paper hover:bg-forest">{t("c.acct.saveName")}</button>
            <button type="button" onClick={() => { setEditing(false); setMsg(null); }} className="text-sm text-ink-muted underline hover:text-ink">{t("c.auth.skip")}</button>
          </form>
        ) : (
          <h2 className="font-display text-3xl font-semibold text-ink">
            {displayName ?? ""}
            <button type="button" onClick={() => { setName(displayName ?? ""); setEditing(true); }} className="ml-2 align-middle text-xs font-normal text-ink-faint underline hover:text-ink">{t("c.mp.edit")}</button>
          </h2>
        )}
        <label className="flex items-center gap-1.5 text-sm text-ink" title={isPublic ? t("c.mp.publicHint") : t("c.mp.privateHint")}>
          <input type="checkbox" checked={isPublic} onChange={(e) => void togglePublic(e.target.checked)} className="h-4 w-4 accent-matcha" />
          {t("c.mp.public")}
        </label>
        {isPublic && displayName && (
          <Link href={`/u/${encodeURIComponent(displayName)}`} className="text-sm text-matcha underline hover:text-forest">{t("c.mp.viewPublic")}</Link>
        )}
      </div>

      {stats && (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted tabular-nums">
          <TierIcon tier={stats.tier} size={22} />
          <span className="font-medium text-ink">{tv("tier", stats.tier)}</span>
          <span>· {t("c.acct.points", { n: stats.points })}</span>
          {stats.next_tier && stats.next_at != null && <span className="text-ink-faint">{t("c.acct.next", { n: stats.next_at - stats.points, tier: tv("tier", stats.next_tier) })}</span>}
        </p>
      )}
      {stats?.next_at != null && (
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={stats.next_at} aria-valuenow={stats.points} aria-label={t("c.acct.progress")}>
          <div className="h-full rounded-full bg-matcha" style={{ width: `${Math.min(100, (stats.points / stats.next_at) * 100)}%` }} />
        </div>
      )}

      <div className="mt-4 max-w-xl">
        <textarea
          value={b?.draft ?? ""}
          onChange={(e) => b && setBio({ ...b, draft: e.target.value.slice(0, 140) })}
          rows={2}
          placeholder={t("c.mp.bioPh")}
          aria-label={t("c.pp.bio")}
          className="w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha"
        />
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
          <span className="tabular-nums">{b?.draft.length ?? 0}/140</span>
          {b && b.draft.trim() !== b.saved && (
            <button type="button" onClick={() => void saveBio()} className="rounded-full bg-matcha px-3 py-1 text-xs font-medium text-paper hover:bg-forest">{t("c.mp.bioSave")}</button>
          )}
          {msg && <span className="text-ink-muted" aria-live="polite">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
