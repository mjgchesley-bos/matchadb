"use client";

import Link from "@/i18n/Link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TierBadge } from "@/components/TierBadge";
import { supabase } from "@/lib/supabase";
import { useLang, useT } from "@/i18n/client";
import { INTL_LANG } from "@/i18n/config";

// Comment section for a product or a brand page, with up to three photos per comment.
// Text-only comments appear at once; comments with photos wait for approval (the database
// enforces this). Photos are shrunk and re-encoded in the browser before upload, which also
// removes hidden metadata such as GPS location.

export const COMMENT_BUCKET = "comment-photos";
const MAX_PHOTOS = 3;
const MAX_CHARS = 1500;
const MAX_SIDE = 1600;

type Pub = { id: string; body: string; photos: string[]; created_at: string; display_name: string; tier?: string | null; public_profile?: boolean };
type Mine = { id: string; body: string; photos: string[]; status: "pending" | "approved" | "hidden"; created_at: string };

export const commentPhotoUrl = (path: string): string => supabase().storage.from(COMMENT_BUCKET).getPublicUrl(path).data.publicUrl;

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.82));
}

// The English wording is what gets stored with a report; what the visitor reads is translated.
const REPORT_REASONS = [
  { value: "Spam or ad", key: "c.cm.reason.spam" },
  { value: "Offensive", key: "c.cm.reason.offensive" },
  { value: "Inappropriate photo", key: "c.cm.reason.photo" },
  { value: "Other", key: "c.cm.reason.other" },
] as const;

// Photos show at a readable size with their own proportions (not a cropped thumbnail); a click opens the full-size file.
// data-notrack: opening a member's photo is not an outbound click for the analytics.
function Photos({ paths, who }: { paths: string[]; who: string }) {
  const t = useT();
  if (!paths.length) return null;
  const single = paths.length === 1;
  return (
    <div className="mt-3 flex flex-wrap items-start gap-3">
      {paths.map((p) => (
        <a key={p} href={commentPhotoUrl(p)} target="_blank" rel="noopener noreferrer" data-notrack className="block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- user photo from storage, already shrunk */}
          <img
            src={commentPhotoUrl(p)}
            alt={t("c.cm.photoBy", { who })}
            loading="lazy"
            className={`${single ? "max-h-[28rem]" : "h-52 sm:h-64"} w-auto max-w-full rounded-sm border border-line hover:opacity-90`}
          />
        </a>
      ))}
    </div>
  );
}

// A small heart with the count. Your own comment shows the count but cannot be clicked (the database also refuses it).
function HeartButton({ count, on, own, label, labelOn, onClick }: { count: number; on: boolean; own: boolean; label: string; labelOn: string; onClick: () => void }) {
  const icon = (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.4 5 6.6 5c2 0 3.6 1.2 5.4 3.2C13.8 6.2 15.4 5 17.4 5c3.2 0 4.9 3 3.8 6.2-1.7 4.7-9.2 9.3-9.2 9.3z" />
    </svg>
  );
  if (own) {
    return count > 0 ? (
      <span className="ml-auto inline-flex items-center gap-1 text-sm tabular-nums text-ink-faint" title={label}>
        {icon}
        {count}
      </span>
    ) : null;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? labelOn : label}
      title={on ? labelOn : label}
      className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm tabular-nums transition-colors hover:bg-matcha-soft ${on ? "text-rose-600" : "text-ink-faint hover:text-rose-600"}`}
    >
      {icon}
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

export function Comments({
  targetType,
  targetKey,
  subject,
  heading,
  placeholder,
}: {
  targetType: "product" | "brand" | "cafe";
  targetKey: string;
  subject: string;
  heading?: string;
  placeholder?: string;
}) {
  const { user, signIn } = useAuth();
  const t = useT();
  const lang = useLang();
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric" }), [lang]);
  const uid = user?.id ?? null;
  const [pub, setPub] = useState<Pub[] | null>(null);
  const [mineState, setMineState] = useState<{ uid: string; list: Mine[] } | null>(null);
  const mine = uid && mineState?.uid === uid ? mineState.list : [];
  const [tick, setTick] = useState(0);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [hearts, setHearts] = useState<Record<string, number>>({});
  const [myHearts, setMyHearts] = useState<Set<string>>(new Set());
  const picker = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let live = true;
    supabase()
      .from("approved_comments")
      .select("id, body, photos, created_at, display_name, tier, public_profile")
      .eq("target_type", targetType)
      .eq("target_key", targetKey)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => live && setPub((data as Pub[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [targetType, targetKey, tick]);

  const pubIds = useMemo(() => (pub ?? []).map((c) => c.id), [pub]);
  useEffect(() => {
    if (!pubIds.length) return;
    let live = true;
    const sb = supabase();
    sb.from("comment_heart_counts")
      .select("comment_id, hearts")
      .in("comment_id", pubIds)
      .then(({ data }) => {
        if (!live || !data) return;
        const m: Record<string, number> = {};
        for (const r of data as { comment_id: string; hearts: number }[]) m[r.comment_id] = r.hearts;
        setHearts(m);
      });
    if (uid)
      sb.from("comment_hearts")
        .select("comment_id")
        .in("comment_id", pubIds)
        .then(({ data }) => live && data && setMyHearts(new Set((data as { comment_id: string }[]).map((r) => r.comment_id))));
    return () => {
      live = false;
    };
  }, [pubIds, uid]);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("comments")
      .select("id, body, photos, status, created_at")
      .eq("target_type", targetType)
      .eq("target_key", targetKey)
      .order("created_at", { ascending: false })
      .then(({ data }) => live && setMineState({ uid, list: (data as Mine[] | null) ?? [] }));
    return () => {
      live = false;
    };
  }, [uid, targetType, targetKey, tick]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok = [...list].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (ok.length < list.length) setMessage(t("c.cm.onlyImages"));
    setFiles((cur) => [...cur, ...ok].slice(0, MAX_PHOTOS));
    if (picker.current) picker.current.value = "";
  };

  const post = async () => {
    if (!user) return;
    const body = text.trim();
    if (!body) return setMessage(t("c.cm.writeFirst"));
    setBusy(true);
    setMessage(null);
    const sb = supabase();
    const uploaded: string[] = [];
    try {
      for (const f of files) {
        const blob = await shrink(f);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from(COMMENT_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        uploaded.push(path);
      }
      const { data, error } = await sb
        .from("comments")
        .insert({ user_id: user.id, target_type: targetType, target_key: targetKey, body, photos: uploaded })
        .select("status")
        .single();
      if (error) throw error;
      window.gtag?.("event", "comment_submit", { target_type: targetType, photos: uploaded.length });
      setText("");
      setFiles([]);
      setMessage(data.status === "pending" ? t("c.cm.thanksPending") : t("c.cm.thanks"));
      setTick((t) => t + 1);
    } catch (e) {
      if (uploaded.length) await sb.storage.from(COMMENT_BUCKET).remove(uploaded);
      const msg = e instanceof Error ? e.message : "";
      setMessage(msg.includes("Too many") ? t("c.cm.tooMany") : t("c.cm.failed"));
    }
    setBusy(false);
  };

  const remove = async (c: Mine) => {
    if (!confirm(t("c.cm.confirmDelete"))) return;
    const sb = supabase();
    if (c.photos.length) await sb.storage.from(COMMENT_BUCKET).remove(c.photos);
    const { error } = await sb.from("comments").delete().eq("id", c.id);
    if (!error) setTick((t) => t + 1);
  };

  const report = async (id: string, reason: string) => {
    if (!user) return signIn(t("c.cm.signInReport"));
    const { error } = await supabase().from("comment_reports").insert({ comment_id: id, reporter_id: user.id, reason });
    if (!error || error.code === "23505") {
      setReported((s) => new Set(s).add(id));
      setReporting(null);
    }
  };

  const toggleHeart = async (id: string) => {
    if (!user) return signIn(t("c.cm.heartSignIn"));
    const had = myHearts.has(id);
    const bump = (n: number) => {
      setMyHearts((s) => {
        const x = new Set(s);
        if (n > 0) x.add(id);
        else x.delete(id);
        return x;
      });
      setHearts((h) => ({ ...h, [id]: Math.max(0, (h[id] ?? 0) + n) }));
    };
    bump(had ? -1 : 1);                       // show the change at once, undo it if the database says no
    const sb = supabase();
    const { error } = had
      ? await sb.from("comment_hearts").delete().eq("comment_id", id).eq("user_id", user.id)
      : await sb.from("comment_hearts").insert({ comment_id: id, user_id: user.id });
    if (error && error.code !== "23505") bump(had ? 1 : -1);
    else if (!had) window.gtag?.("event", "comment_heart", { target_type: targetType });
  };

  const mineIds = new Set(mine.map((m) => m.id));
  // Most-hearted first (like Reddit's "top"); ties keep the newest first.
  const ranked = useMemo(
    () => [...(pub ?? [])].sort((a, b) => (hearts[b.id] ?? 0) - (hearts[a.id] ?? 0) || +new Date(b.created_at) - +new Date(a.created_at)),
    [pub, hearts],
  );
  const waiting = mine.filter((m) => m.status === "pending");

  return (
    <section className="mt-12" aria-labelledby={`comments-${targetType}`}>
      <h2 id={`comments-${targetType}`} className="font-display text-xl font-semibold text-ink">
        {heading ?? t("c.cm.heading")}
      </h2>

      {!user ? (
        <p className="mt-3 text-sm text-ink-muted">
          <button type="button" onClick={() => signIn(t("c.cm.signInPrompt", { subject }))} className="text-matcha underline hover:text-forest">
            {t("c.cm.signIn")}
          </button>{" "}
          {t("c.cm.signInTail")}
        </p>
      ) : (
        <div className="mt-4">
          <label htmlFor={`comment-${targetType}`} className="block text-sm font-medium text-ink">
            {t("c.cm.addLabel", { subject })}
          </label>
          <textarea
            id={`comment-${targetType}`}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            rows={3}
            placeholder={placeholder ?? t("c.cm.placeholder")}
            className="mt-2 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
          />
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={src} alt={t("c.cm.selected", { n: i + 1 })} className="h-20 w-20 rounded-sm border border-line object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                    aria-label={t("c.cm.removePhoto", { n: i + 1 })}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" id={`photos-${targetType}`} onChange={(e) => addFiles(e.target.files)} />
            <label
              htmlFor={`photos-${targetType}`}
              className={`cursor-pointer rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm text-ink hover:bg-matcha-soft ${files.length >= MAX_PHOTOS ? "pointer-events-none opacity-50" : ""}`}
            >
              {t("c.cm.addPhotos", { n: files.length, max: MAX_PHOTOS })}
            </label>
            <button
              type="button"
              onClick={post}
              disabled={busy || !text.trim()}
              className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-forest disabled:opacity-50"
            >
              {busy ? t("c.cm.posting") : t("c.cm.post")}
            </button>
            <span className="text-xs text-ink-faint tabular-nums">
              {text.trim().length}/{MAX_CHARS}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-faint">{t("c.cm.rules")}</p>
        </div>
      )}
      {message && (
        <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
          {message}
        </p>
      )}

      {waiting.map((c) => (
        <article key={c.id} className="mt-4 rounded-sm border border-line bg-paper-raised px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{t("c.cm.awaiting")}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{c.body}</p>
          <Photos paths={c.photos} who={t("c.cm.you")} />
          <button type="button" onClick={() => void remove(c)} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
            {t("c.cm.delete")}
          </button>
        </article>
      ))}

      <div className="mt-6 flex flex-col gap-4">
        {pub === null && <p className="text-sm text-ink-faint">{t("c.cm.loading")}</p>}
        {pub?.length === 0 && waiting.length === 0 && <p className="text-sm text-ink-muted">{t("c.cm.none")}</p>}
        {ranked.map((c) => (
          <article key={c.id} className="rounded-sm border border-line bg-paper-raised px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {c.public_profile ? (
                <Link href={`/u/${encodeURIComponent(c.display_name)}`} className="text-base font-semibold text-matcha hover:text-forest hover:underline">
                  {c.display_name}
                </Link>
              ) : (
                <span className="text-base font-semibold text-matcha">{c.display_name}</span>
              )}
              <TierBadge tier={c.tier} />
              <span className="text-xs text-ink-faint">{dateFmt.format(new Date(c.created_at))}</span>
              <HeartButton
                count={hearts[c.id] ?? 0}
                on={myHearts.has(c.id)}
                own={mineIds.has(c.id)}
                label={t("c.cm.heart")}
                labelOn={t("c.cm.unheart")}
                onClick={() => void toggleHeart(c.id)}
              />
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-ink leading-relaxed">{c.body}</p>
            <Photos paths={c.photos} who={c.display_name} />
            <div className="mt-2 text-xs text-ink-faint">
              {mineIds.has(c.id) ? (
                <button type="button" onClick={() => void remove(mine.find((m) => m.id === c.id)!)} className="underline hover:text-ink-muted">
                  {t("c.cm.delete")}
                </button>
              ) : reported.has(c.id) ? (
                t("c.cm.reported")
              ) : reporting === c.id ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {t("c.cm.why")}
                  {REPORT_REASONS.map((reason) => (
                    <button key={reason.value} type="button" onClick={() => void report(c.id, reason.value)} className="rounded-full border border-line-strong px-2.5 py-0.5 hover:bg-matcha-soft">
                      {t(reason.key)}
                    </button>
                  ))}
                  <button type="button" onClick={() => setReporting(null)} className="underline">
                    {t("c.cm.cancel")}
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => (user ? setReporting(c.id) : signIn(t("c.cm.signInReport")))} className="underline hover:text-ink-muted">
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
