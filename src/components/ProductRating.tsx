"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

// Community star rating for one product. Hover to preview in half-star steps, click (or
// tap) to rate. The community score is only shown once enough people have rated, so one
// person's opinion is never presented as the product's score.

type State = { available: boolean; count: number; average: number | null; mine: number | null };
const MIN_TO_SHOW = 5; // mirrors MIN_RATINGS_TO_SHOW in src/lib/ratings.ts
const STAR = "M12 2.5l2.95 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6 5.95 20.9l1.3-6.7-5-4.7 6.8-.8L12 2.5z";

function Stars({ value, size = 28 }: { value: number; size?: number }) {
  const uid = useId();
  return (
    <span className="inline-flex text-gold" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const frac = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <clipPath id={`${uid}-${i}`}>
                <rect x="0" y="0" width={24 * frac} height="24" />
              </clipPath>
            </defs>
            <path d={STAR} fill="var(--color-paper-raised)" stroke="var(--color-line-strong)" strokeWidth="1.2" strokeLinejoin="round" />
            <path d={STAR} fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" clipPath={`url(#${uid}-${i})`} />
          </svg>
        );
      })}
    </span>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export function ProductRating({ productId, productName }: { productId: number; productName: string }) {
  const [state, setState] = useState<State | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [draft, setDraft] = useState<number | null>(null); // keyboard selection before it is saved
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pad = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/ratings/${productId}`)
      .then((r) => (r.ok ? (r.json() as Promise<State>) : Promise.reject()))
      .then((s) => live && setState(s))
      .catch(() => live && setState({ available: false, count: 0, average: null, mine: null }));
    return () => {
      live = false;
    };
  }, [productId]);

  const submit = useCallback(
    async (rating: number) => {
      setSaving(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/ratings/${productId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Couldn't save your rating.");
        setState(json as State);
        setDraft(null);
        setMessage("Thanks, your rating is saved.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Couldn't save your rating.");
      } finally {
        setSaving(false);
      }
    },
    [productId]
  );

  const valueAt = (clientX: number): number => {
    const r = pad.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.max(0.5, Math.ceil(x * 10) / 2);
  };

  if (!state) return <div className="mt-4 h-[84px]" aria-hidden="true" />;
  // Storage not configured or unreachable: show nothing instead of a broken-looking box.
  if (!state.available) return null;

  const shown = hover ?? draft ?? state.mine ?? 0;
  const remaining = Math.max(0, MIN_TO_SHOW - state.count);

  return (
    <section className="mt-4 rounded-sm border border-line bg-paper-raised px-4 py-3 max-w-md" aria-label="Community rating">
      <div className="flex items-center gap-3 flex-wrap">
        {state.average != null ? (
          <>
            <span className="font-display text-2xl font-semibold text-ink tabular-nums">{state.average.toFixed(1)}</span>
            <Stars value={state.average} size={20} />
            <span className="text-sm text-ink-muted">
              {state.count.toLocaleString()} community rating{state.count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="text-sm text-ink-muted">
            {state.count === 0
              ? "No community ratings yet. Be the first to rate it."
              : `${state.count} community rating${state.count === 1 ? "" : "s"} so far. The score appears after ${MIN_TO_SHOW}${remaining > 0 ? ` (${remaining} more)` : ""}.`}
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
            const cur = draft ?? state.mine ?? 0;
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
              : state.mine != null
                ? `Your rating: ${fmt(state.mine)}. Click to change it.`
                : "Click a star to rate"}
        </span>
      </div>
      {message && <p className="mt-2 text-xs text-ink-faint">{message}</p>}
    </section>
  );
}
