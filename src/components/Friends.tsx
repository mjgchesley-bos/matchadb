"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT, useTV } from "@/i18n/client";

// Following and friends. One-way follow with no approval; two members who follow each other are "Friends".
// All of it goes through database functions (supabase/friends.sql): they return usernames and avatars only,
// never an email or a real name, and a full name or email only finds a member who switched that on.
type Person = { name: string; avatar: string | null; avatar_path: string | null; public: boolean; tier?: string; following?: boolean; friend?: boolean };
type Network = { following: Person[]; followers: (Person & { friend: boolean })[] };

const btn = "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors disabled:opacity-60";

function FollowToggle({ on, friend, followsMe, busy, onClick }: { on: boolean; friend?: boolean; followsMe?: boolean; busy: boolean; onClick: () => void }) {
  const t = useT();
  const label = on ? (friend ? t("c.fr.friends") : t("c.fr.following")) : followsMe ? t("c.fr.followBack") : t("c.fr.follow");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={on ? t("c.fr.unfollow") : undefined}
      className={`${btn} ${on ? "border-line-strong bg-paper text-ink-muted hover:border-red-700 hover:text-red-700" : "border-matcha bg-matcha text-paper hover:bg-forest"}`}
    >
      {label}
    </button>
  );
}

function PersonRow({ p, on, friend, followsMe, busy, onToggle }: { p: Person; on: boolean; friend?: boolean; followsMe?: boolean; busy: boolean; onToggle: () => void }) {
  const t = useT();
  const tv = useTV();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar avatar={p.avatar} photoPath={p.avatar_path} name={p.name} size={36} />
      <div className="min-w-0 flex-1">
        {p.public ? (
          <Link href={`/u/${encodeURIComponent(p.name)}`} className="font-medium text-matcha hover:text-forest hover:underline">
            {p.name}
          </Link>
        ) : (
          <span className="font-medium text-ink">{p.name}</span>
        )}
        <span className="ml-2 text-xs text-ink-faint">{p.tier ? tv("tier", p.tier) : !p.public ? t("c.fr.private") : ""}</span>
      </div>
      <FollowToggle on={on} friend={friend} followsMe={followsMe} busy={busy} onClick={onToggle} />
    </li>
  );
}

export function FriendsSection() {
  const t = useT();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [net, setNet] = useState<Network | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadNet = useCallback(async () => {
    const { data, error } = await supabase().rpc("my_network");
    if (!error && data) setNet(data as Network);
  }, []);

  useEffect(() => {
    if (!uid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the member's follow lists once signed in
    void loadNet();
  }, [uid, loadNet]);

  // Search as you type (after a short pause).
  useEffect(() => {
    const term = q.trim();
    if (!uid || term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears results when the box is emptied
      setResults(null);
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase().rpc("search_members", { p_q: term });
      if (!live) return;
      setSearching(false);
      if (error) setErr(t("c.fr.err"));
      else {
        setErr(null);
        setResults((data as Person[]) ?? []);
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, uid, t]);

  if (!user) return null;

  const toggle = async (p: Person, following: boolean) => {
    setBusy(p.name);
    setErr(null);
    const { error } = await supabase().rpc(following ? "unfollow_member" : "follow_member", { p_name: p.name });
    if (error) setErr(t("c.fr.err"));
    else {
      setResults((cur) => cur?.map((r) => (r.name === p.name ? { ...r, following: !following } : r)) ?? cur);
      await loadNet();
      window.gtag?.("event", following ? "unfollow" : "follow");
    }
    setBusy(null);
  };

  const followingNames = new Set(net?.following.map((f) => f.name) ?? []);
  const followerNames = new Set(net?.followers.map((f) => f.name) ?? []);

  return (
    <section aria-labelledby="fr-h">
      <h2 id="fr-h" className="font-display text-xl font-semibold text-ink">
        {t("c.fr.h")}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">{t("c.fr.intro")}</p>

      <label htmlFor="fr-q" className="mt-4 block text-sm font-medium text-ink">
        {t("c.fr.search.label")}
      </label>
      <input
        id="fr-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("c.fr.search.ph")}
        maxLength={120}
        autoComplete="off"
        className="mt-1 w-full max-w-md rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha"
      />
      <p className="mt-1.5 max-w-xl text-xs text-ink-faint">{t("c.fr.search.hint")}</p>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}

      {q.trim().length >= 2 && (
        <div className="mt-3 max-w-xl" aria-live="polite">
          {searching && !results && <p className="text-sm text-ink-faint">{t("c.fr.searching")}</p>}
          {results && results.length === 0 && <p className="text-sm text-ink-muted">{t("c.fr.none")}</p>}
          {results && results.length > 0 && (
            <ul className="divide-y divide-line border-y border-line">
              {results.map((p) => (
                <PersonRow
                  key={p.name}
                  p={p}
                  on={!!p.following}
                  friend={!!p.following && followerNames.has(p.name)}
                  followsMe={followerNames.has(p.name)}
                  busy={busy === p.name}
                  onToggle={() => void toggle(p, !!p.following)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {net && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{t("c.fr.followingH", { n: net.following.length })}</h3>
            {net.following.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t("c.fr.emptyFollowing")}</p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {net.following.map((p) => (
                  <PersonRow key={p.name} p={p} on friend={p.friend} busy={busy === p.name} onToggle={() => void toggle(p, true)} />
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{t("c.fr.followersH", { n: net.followers.length })}</h3>
            {net.followers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t("c.fr.emptyFollowers")}</p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {net.followers.map((p) => (
                  <PersonRow
                    key={p.name}
                    p={p}
                    on={followingNames.has(p.name)}
                    friend={p.friend}
                    followsMe
                    busy={busy === p.name}
                    onToggle={() => void toggle(p, followingNames.has(p.name))}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// On a public profile: follower and following counts, and the Follow button for everyone but the owner.
export function FollowBar({ name }: { name: string }) {
  const t = useT();
  const { user, displayName, signIn } = useAuth();
  const [info, setInfo] = useState<{ followers: number; following: number; i_follow: boolean; follows_me: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const own = !!user && displayName?.toLowerCase() === name.toLowerCase();
  const uid = user?.id ?? null;

  const load = useCallback(async () => {
    const { data } = await supabase().rpc("follow_info", { p_name: name });
    if (data) setInfo(data as typeof info);
  }, [name]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads counts and my relationship to this member
    void load();
  }, [load, uid]);

  const click = async () => {
    if (!user) return signIn(t("c.fr.signin"));
    if (!info) return;
    setBusy(true);
    await supabase().rpc(info.i_follow ? "unfollow_member" : "follow_member", { p_name: name });
    await load();
    window.gtag?.("event", info.i_follow ? "unfollow" : "follow");
    setBusy(false);
  };

  if (!info) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
      {!own && <FollowToggle on={info.i_follow} friend={info.i_follow && info.follows_me} followsMe={info.follows_me} busy={busy} onClick={() => void click()} />}
      <span>{t("c.fr.countFollowers", { n: info.followers })}</span>
      <span>{t("c.fr.countFollowing", { n: info.following })}</span>
    </div>
  );
}
