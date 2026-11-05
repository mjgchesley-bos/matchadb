"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Who is signed in, plus the sign-in dialog any component can open with signIn("why").
// Sign-in is Google only for now. The session lives in the browser, so the (static) pages
// stay fast and cacheable and each signed-in widget loads its own data.

// What My matcha and the header show about a member: tier, points and activity counts. The numbers and
// tier thresholds come from the database (my_stats), the single source of truth.
export type MemberStats = {
  points: number;
  tier: string;
  next_tier: string | null;
  next_at: number | null;
  ratings: number;
  reviews: number;
  comments: number;
  photos: number;
  saves: number;
  brands: number;
  shelf: number;
  bookmarks: number;
  days: number;
};

type Auth = {
  ready: boolean;
  user: User | null;
  displayName: string | null;
  isPublic: boolean;
  setPublic: (v: boolean) => void;
  stats: MemberStats | null;
  refreshStats: () => Promise<void>;
  signIn: (reason?: string) => void;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => void;
};

const AuthContext = createContext<Auth>({
  ready: false,
  user: null,
  displayName: null,
  isPublic: false,
  setPublic: () => {},
  stats: null,
  refreshStats: async () => {},
  signIn: () => {},
  signOut: async () => {},
  setDisplayName: () => {},
});

export const useAuth = () => useContext(AuthContext);

// New accounts start with a neutral public name (set by the database); the first time someone
// signs in they are invited to pick their own. Names that could pass for the site or its
// moderators are refused here and by a database constraint.
export const DEFAULT_NAME = /^Matcha fan [0-9a-f]{5}$/;
export const RESERVED_NAME = /matchadb|admin|moderator|official/i;
const skipKey = (uid: string) => `mdb-name-skip:${uid}`;
const hasSkipped = (uid: string): boolean => {
  try {
    return localStorage.getItem(skipKey(uid)) === "1";
  } catch {
    return false;
  }
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ uid: string; name: string | null; isPublic: boolean } | null>(null);
  const [dialog, setDialog] = useState<{ reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const [skippedUid, setSkippedUid] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const sb = supabase();
    let live = true;
    sb.auth.getSession().then(({ data }) => {
      if (!live) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) setDialog(null);
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // The public username (never the email or real name) lives in the profiles table.
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("profiles")
      .select("display_name, is_public")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => live && setProfile({ uid, name: data?.display_name ?? null, isPublic: !!data?.is_public }));
    return () => {
      live = false;
    };
  }, [uid]);
  const displayName = profile && profile.uid === uid ? profile.name : null;

  // Record today as a visit (once per day per member), then load tier and counts.
  const [statsState, setStatsState] = useState<{ uid: string; value: MemberStats | null } | null>(null);
  const stats = statsState && statsState.uid === uid ? statsState.value : null;
  const refreshStats = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase().rpc("my_stats");
    setStatsState({ uid, value: (data as MemberStats | null) ?? null });
  }, [uid]);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    const sb = supabase();
    sb.from("member_days")
      .upsert({ user_id: uid }, { onConflict: "user_id,day", ignoreDuplicates: true })
      .then(() => sb.rpc("my_stats"))
      .then(({ data }) => live && setStatsState({ uid, value: (data as MemberStats | null) ?? null }));
    return () => {
      live = false;
    };
  }, [uid]);
  const isPublic = profile && profile.uid === uid ? profile.isPublic : false;
  const setDisplayName = useCallback((name: string) => uid && setProfile((p) => ({ uid, name, isPublic: p && p.uid === uid ? p.isPublic : false })), [uid]);
  const setPublic = useCallback((v: boolean) => uid && setProfile((p) => ({ uid, name: p && p.uid === uid ? p.name : null, isPublic: v })), [uid]);

  const signIn = useCallback((reason?: string) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError(null);
    setDialog({ reason: reason ?? "Sign in to save products, rate them and write reviews." });
  }, []);

  const close = useCallback(() => {
    setDialog(null);
    opener.current?.focus();
  }, []);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    setUser(null);
  }, []);

  const google = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (err) {
      setError("Google sign-in isn't available right now. Please try again later.");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  const needsName = !!user && !!displayName && DEFAULT_NAME.test(displayName) && skippedUid !== user.id && !hasSkipped(user.id);

  const skipName = () => {
    if (!user) return;
    setSkippedUid(user.id);
    try {
      localStorage.setItem(skipKey(user.id), "1");
    } catch {}
  };

  const saveName = async () => {
    if (!user) return;
    const next = nameDraft.trim();
    if (next.length < 2 || next.length > 30) return setNameMsg("Use 2 to 30 characters.");
    if (RESERVED_NAME.test(next) || DEFAULT_NAME.test(next)) return setNameMsg("That name isn't available. Try another.");
    setSavingName(true);
    setNameMsg(null);
    const { error: err } = await supabase().from("profiles").update({ display_name: next }).eq("id", user.id);
    setSavingName(false);
    if (err) return setNameMsg(err.code === "23505" ? "That name is taken. Try another." : "That name isn't available. Try another.");
    setDisplayName(next);
  };

  const value = useMemo<Auth>(
    () => ({ ready, user, displayName, isPublic, setPublic, stats, refreshStats, signIn, signOut, setDisplayName }),
    [ready, user, displayName, isPublic, setPublic, stats, refreshStats, signIn, signOut, setDisplayName]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="signin-title" className="w-full max-w-sm rounded-md border border-line bg-paper-raised p-6 shadow-lg">
            <h2 id="signin-title" className="font-display text-xl font-semibold text-ink">
              Sign in to MatchaDB
            </h2>
            <p className="mt-2 text-sm text-ink-muted">{dialog.reason}</p>
            <button
              type="button"
              onClick={google}
              disabled={busy}
              autoFocus
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-paper px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-matcha-soft disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <p className="mt-4 text-xs text-ink-faint">
              We only use your Google account to sign you in. Your name and email are never shown publicly. By
              continuing you agree to the{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
            <button type="button" onClick={close} className="mt-4 text-sm text-ink-muted underline hover:text-ink">
              Not now
            </button>
          </div>
        </div>
      )}
      {needsName && !dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="name-title" className="w-full max-w-sm rounded-md border border-line bg-paper-raised p-6 shadow-lg">
            <h2 id="name-title" className="font-display text-xl font-semibold text-ink">
              Create a username
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Shown next to your ratings and reviews. Your email and Google name stay private.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveName();
              }}
            >
              <label htmlFor="new-display-name" className="mt-4 block text-sm font-medium text-ink">
                Username:
              </label>
              <input
                id="new-display-name"
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  setNameMsg(null);
                }}
                maxLength={30}
                autoFocus
                autoComplete="username"
                className="mt-1.5 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
              />
              {nameMsg && <p className="mt-2 text-sm text-red-700">{nameMsg}</p>}
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={savingName || nameDraft.trim().length < 2}
                  className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-forest disabled:opacity-50"
                >
                  Save
                </button>
                <button type="button" onClick={skipName} className="text-sm text-ink-muted underline hover:text-ink">
                  Skip for now
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs text-ink-faint">You can change it any time under My matcha.</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
