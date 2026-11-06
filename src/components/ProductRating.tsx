"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Stars } from "@/components/Stars";
import { supabase } from "@/lib/supabase";

// Community star rating for one product. Hover to preview in half-star steps, click (or
// tap) to rate; you need to be signed in, and each person has one rating they can change.
// The community score is only shown once enough people have rated, so one person's
// opinion is never presented as the product's score.

type Stats = { count: number; average: number | null };
const MIN_TO_SHOW = 5;

const fmt = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

// Rates a product (productId) or, with cafeId, a café.
export function ProductRating({ productId, cafeId, productName }: { productId?: number; cafeId?: string; productName: string }) {
  const { user, signIn } = useAuth();
  const table = cafeId ? "cafe_ratings" : "ratings";
  const view = cafeId ? "cafe_rating_stats" : "rating_stats";
  const col = cafeId ? "cafe_id" : "product_id";
  const key: string | number = cafeId ?? productId ?? 0;
  const [stats, setStats] = useState<Stats | null | "error">(null);
  const [mineState, setMineState] = useState<{ uid: string; score: number | null } | null>(null);
  const mine = user && mineState?.uid === user.id ? mineState.score : null;
  const setMine = (score: number | null) => user && setMineState({ uid: user.id, score });
  const [hover, setHover] = useState<number | null>(null);
  const [draft, setDraft] = useState<number | null>(null); // keyboard selection before it is saved
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pad = useRef<HTMLDivElement | null>(null);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase().from(view).select("rating_count, average").eq(col, key).maybeSingle();
    if (error) return setStats("error");
    setStats({ count: data?.rating_count ?? 0, average: data?.average ?? null });
  }, [view, col, key]);

  useEffect(() => {
    let live = true;
    supabase()
      .from(view)
      .select("rating_count, average")
      .eq(col, key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        setStats(error ? "error" : { count: data?.rating_count ?? 0, average: data?.average ?? null });
      });
    return () => {
      live = false;
    };
  }, [view, col, key]);

  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from(table)
      .select("score")
      .eq(col, key)
      .maybeSingle()
      .then(({ data }) => live && setMineState({ uid, score: data ? Number(data.score) : null }));
    return () => {
      live = false;
    };
  }, [uid, table, col, key]);

  const submit = useCallback(
    async (rating: number) => {
      if (!user) {
        signIn(`Sign in to rate ${productName}.`);
        return;
      }
      setSaving(true);
      setMessage(null);
      const { error } = await supabase()
        .from(table)
        .upsert({ user_id: user.id, [col]: key, score: rating, updated_at: new Date().toISOString() }, { onConflict: `user_id,${col}` });
      if (error) {
        setMessage("Couldn't save your rating. Please try again.");
      } else {
        setMineState({ uid: user.id, score: rating });
        setDraft(null);
        window.gtag?.("event", "rating_submit", { [col]: key, rating });
        setMessage("Thanks, your rating is saved.");
        void loadStats();
      }
      setSaving(false);
    },
    [user, signIn, table, col, key, productName, loadStats]
  );

  const clear = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase().from(table).delete().eq("user_id", user.id).eq(col, key);
    if (!error) {
      setMine(null);
      setMessage("Your rating was removed.");
      void loadStats();
    }
    setSaving(false);
  };

  const valueAt = (clientX: number): number => {
    const r = pad.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.max(0.5, Math.ceil(x * 10) / 2);
  };

  if (stats === null) return <div className="mt-4 h-[84px]" aria-hidden="true" />;
  // Backend unreachable: show nothing instead of a broken-looking box.
  if (stats === "error") return null;

  const shown = hover ?? draft ?? mine ?? 0;
  const remaining = Math.max(0, MIN_TO_SHOW - stats.count);

  return (
    <section className="mt-4 rounded-sm border border-line bg-paper-raised px-4 py-3 max-w-md" aria-label="Community rating">
      <div className="flex items-center gap-3 flex-wrap">
        {stats.average != null && stats.count >= MIN_TO_SHOW ? (
          <>
            <span className="font-display text-2xl font-semibold text-ink tabular-nums">{stats.average.toFixed(1)}</span>
            <Stars value={stats.average} size={20} />
            <span className="text-sm text-ink-muted">
              {stats.count.toLocaleString()} community rating{stats.count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="text-sm text-ink-muted">
            {stats.count === 0
              ? "No community ratings yet. Be the first to rate it."
              : `${stats.count} community rating${stats.count === 1 ? "" : "s"} so far. The score appears after ${MIN_TO_SHOW}${remaining > 0 ? ` (${remaining} more)` : ""}.`}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div
          ref={pad}
          role="slider"
          tabIndex={0}
          aria-label={`Rate ${productName}`}
          aria-valuemin={0.5}
          aria-valuemax={5}
          aria-valuenow={shown || undefined}
          aria-valuetext={shown ? `${fmt(shown)} out of 5 stars` : "not rated"}
          className="inline-flex cursor-pointer touch-none select-none rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-matcha"
          onPointerMove={(e) => setHover(valueAt(e.clientX))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            if (!saving) void submit(valueAt(e.clientX));
          }}
          onKeyDown={(e) => {
            const cur = draft ?? mine ?? 0;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              setDraft(Math.min(5, cur + 0.5));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              setDraft(Math.max(0.5, cur - 0.5));
            } else if ((e.key === "Enter" || e.key === " ") && draft != null && !saving) {
              e.preventDefault();
              void submit(draft);
            }
          }}
        >
          <Stars value={shown} />
        </div>
        <span className="text-sm text-ink-muted tabular-nums" aria-live="polite">
          {hover != null
            ? `${fmt(hover)} / 5`
            : draft != null
              ? `${fmt(draft)} / 5, press Enter to save`
              : mine != null
                ? `Your rating: ${fmt(mine)}. Click to change it.`
                : user
                  ? "Click a star to rate"
                  : "Click a star to rate (sign in required)"}
        </span>
      </div>
      {(message || mine != null) && (
        <p className="mt-2 text-xs text-ink-faint">
          {message}
          {mine != null && (
            <button type="button" onClick={clear} disabled={saving} className="ml-2 underline hover:text-ink-muted">
              Remove my rating
            </button>
          )}
        </p>
      )}
    </section>
  );
}
