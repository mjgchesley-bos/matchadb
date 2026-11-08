"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Stars } from "@/components/Stars";
import { TierBadge } from "@/components/TierBadge";
import { supabase } from "@/lib/supabase";
import { useLang, useT } from "@/i18n/client";
import { INTL_LANG } from "@/i18n/config";

// Written reviews for one product. Anyone can read the approved ones; signed-in people can
// write one review per product. New and edited reviews wait for approval before they show
// publicly, so spam never lands on pages that search engines index.

type Review = { id: string; body: string; created_at: string; display_name: string; rating: number | null; tier?: string | null; public_profile?: boolean };
type Mine = { id: string; body: string; status: "pending" | "approved" | "hidden" };

const MIN = 20;
const MAX = 2000;
const STATUS_KEY = { pending: "c.rv.status.pending", approved: "c.rv.status.approved", hidden: "c.rv.status.hidden" } as const;
const REASONS = [
  { value: "Spam or ad", key: "c.cm.reason.spam" },
  { value: "Offensive", key: "c.cm.reason.offensive" },
  { value: "Not about this product", key: "c.rv.reason.off" },
  { value: "Other", key: "c.cm.reason.other" },
] as const;

export function ProductReviews({ productId, productName }: { productId: number; productName: string }) {
  const { user, signIn } = useAuth();
  const t = useT();
  const lang = useLang();
  const dateFmt = new Intl.DateTimeFormat(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric" });
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [mineState, setMineState] = useState<{ uid: string; review: Mine | null } | null>(null);
  const mine = user && mineState?.uid === user.id ? mineState.review : null;
  const setMine = (review: Mine | null) => user && setMineState({ uid: user.id, review });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const loadPublic = useCallback(async () => {
    const { data } = await supabase()
      .from("approved_reviews")
      .select("id, body, created_at, display_name, rating")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50);
    setReviews((data as Review[] | null) ?? []);
  }, [productId]);

  useEffect(() => {
    let live = true;
    supabase()
      .from("approved_reviews")
      .select("id, body, created_at, display_name, rating, tier, public_profile")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => live && setReviews((data as Review[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [productId]);

  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("reviews")
      .select("id, body, status")
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data }) => live && setMineState({ uid, review: (data as Mine | null) ?? null }));
    return () => {
      live = false;
    };
  }, [uid, productId]);

  const save = async () => {
    if (!user) return;
    const body = text.trim();
    if (body.length < MIN) return setMessage(t("c.rv.min", { n: MIN }));
    setBusy(true);
    setMessage(null);
    const sb = supabase();
    const { data, error } = mine
      ? await sb.from("reviews").update({ body, status: "pending", updated_at: new Date().toISOString() }).eq("id", mine.id).select("id, body, status").single()
      : await sb.from("reviews").insert({ user_id: user.id, product_id: productId, body }).select("id, body, status").single();
    if (error) {
      setMessage(error.message.includes("Too many") ? t("c.rv.tooMany") : t("c.rv.saveFail"));
    } else {
      setMine(data as Mine);
      setEditing(false);
      setText("");
      window.gtag?.("event", "review_submit", { product_id: productId });
      setMessage(t("c.rv.thanks"));
      void loadPublic();
    }
    setBusy(false);
  };

  const remove = async () => {
    if (!mine || !confirm(t("c.rv.confirmDelete"))) return;
    setBusy(true);
    const { error } = await supabase().from("reviews").delete().eq("id", mine.id);
    if (!error) {
      setMine(null);
      setMessage(t("c.rv.deleted"));
      void loadPublic();
    }
    setBusy(false);
  };

  const report = async (reviewId: string, reason: string) => {
    if (!user) return signIn(t("c.rv.signInReport"));
    const { error } = await supabase().from("review_reports").insert({ review_id: reviewId, reporter_id: user.id, reason });
    if (!error || error.code === "23505") {
      setReported((s) => new Set(s).add(reviewId));
      setReporting(null);
    }
  };

  const form = (
    <div className="mt-4">
      <label htmlFor="review-body" className="block text-sm font-medium text-ink">
        {t("c.rv.label", { name: productName })}
      </label>
      <textarea
        id="review-body"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        rows={5}
        placeholder={t("c.rv.placeholder")}
        className="mt-2 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-ink-faint">
        <span>{t("c.rv.hint")}</span>
        <span className="tabular-nums">
          {text.trim().length}/{MAX}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || text.trim().length < MIN}
          className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-forest disabled:opacity-50"
        >
          {mine ? t("c.rv.save") : t("c.rv.submit")}
        </button>
        {editing && (
          <button type="button" onClick={() => { setEditing(false); setText(""); }} className="text-sm text-ink-muted underline">
            {t("c.cm.cancel")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="mt-12" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="font-display text-xl font-semibold text-ink">
        {t("c.rv.heading")}
      </h2>

      {!user && (
        <p className="mt-3 text-sm text-ink-muted">
          <button type="button" onClick={() => signIn(t("c.rv.signInWrite", { name: productName }))} className="text-matcha underline hover:text-forest">
            {t("c.rv.signInLink")}
          </button>{" "}
          {t("c.rv.signInTail")}
        </p>
      )}

      {user && mine && !editing && (
        <div className="mt-4 rounded-sm border border-line bg-paper-raised px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{t("c.rv.yours")}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{mine.body}</p>
          <p className="mt-2 text-xs text-ink-muted">{t(STATUS_KEY[mine.status])}</p>
          <div className="mt-2 flex gap-4 text-sm">
            <button type="button" onClick={() => { setEditing(true); setText(mine.body); setMessage(null); }} className="text-matcha underline hover:text-forest">
              {t("c.rv.edit")}
            </button>
            <button type="button" onClick={remove} disabled={busy} className="text-ink-muted underline hover:text-ink">
              {t("c.cm.delete")}
            </button>
          </div>
        </div>
      )}
      {user && (!mine || editing) && form}
      {message && <p className="mt-3 text-sm text-ink-muted" aria-live="polite">{message}</p>}

      <div className="mt-6 flex flex-col gap-5">
        {reviews === null && <p className="text-sm text-ink-faint">{t("c.rv.loading")}</p>}
        {reviews?.length === 0 && <p className="text-sm text-ink-muted">{t("c.rv.none")}</p>}
        {reviews?.map((r) => (
          <article key={r.id} className="border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {r.public_profile ? (
                <Link href={`/u/${encodeURIComponent(r.display_name)}`} className="text-sm font-medium text-ink hover:text-matcha">
                  {r.display_name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-ink">{r.display_name}</span>
              )}
              <TierBadge tier={r.tier} />
              {r.rating != null && <Stars value={Number(r.rating)} size={14} />}
              <span className="text-xs text-ink-faint">{dateFmt.format(new Date(r.created_at))}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-ink leading-relaxed">{r.body}</p>
            <div className="mt-2 text-xs text-ink-faint">
              {reported.has(r.id) ? (
                t("c.cm.reported")
              ) : reporting === r.id ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {t("c.cm.why")}
                  {REASONS.map((reason) => (
                    <button key={reason.value} type="button" onClick={() => void report(r.id, reason.value)} className="rounded-full border border-line-strong px-2.5 py-0.5 hover:bg-matcha-soft">
                      {t(reason.key)}
                    </button>
                  ))}
                  <button type="button" onClick={() => setReporting(null)} className="underline">
                    {t("c.cm.cancel")}
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => (user ? setReporting(r.id) : signIn(t("c.rv.signInReport")))} className="underline hover:text-ink-muted">
                  {t("c.cm.report")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
