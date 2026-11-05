"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TierBadge } from "@/components/TierBadge";
import { supabase } from "@/lib/supabase";

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

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
const REPORT_REASONS = ["Spam or ad", "Offensive", "Inappropriate photo", "Other"];

function Photos({ paths, who }: { paths: string[]; who: string }) {
  if (!paths.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {paths.map((p) => (
        <a key={p} href={commentPhotoUrl(p)} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- user photo from storage, already shrunk */}
          <img src={commentPhotoUrl(p)} alt={`Photo shared by ${who}`} loading="lazy" className="h-28 w-28 rounded-sm border border-line object-cover hover:opacity-90" />
        </a>
      ))}
    </div>
  );
}

export function Comments({ targetType, targetKey, subject }: { targetType: "product" | "brand"; targetKey: string; subject: string }) {
  const { user, signIn } = useAuth();
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
    if (ok.length < list.length) setMessage("Only JPG, PNG or WebP photos can be added.");
    setFiles((cur) => [...cur, ...ok].slice(0, MAX_PHOTOS));
    if (picker.current) picker.current.value = "";
  };

  const post = async () => {
    if (!user) return;
    const body = text.trim();
    if (!body) return setMessage("Write something first.");
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
      setMessage(data.status === "pending" ? "Thanks! Comments with photos appear once they have been approved." : "Thanks, your comment is posted.");
      setTick((t) => t + 1);
    } catch (e) {
      if (uploaded.length) await sb.storage.from(COMMENT_BUCKET).remove(uploaded);
      const msg = e instanceof Error ? e.message : "";
      setMessage(msg.includes("Too many") ? "You've posted a lot today. Try again tomorrow." : "Couldn't post that. If you added photos, try smaller or different ones.");
    }
    setBusy(false);
  };

  const remove = async (c: Mine) => {
    if (!confirm("Delete your comment?")) return;
    const sb = supabase();
    if (c.photos.length) await sb.storage.from(COMMENT_BUCKET).remove(c.photos);
    const { error } = await sb.from("comments").delete().eq("id", c.id);
    if (!error) setTick((t) => t + 1);
  };

  const report = async (id: string, reason: string) => {
    if (!user) return signIn("Sign in to report a comment.");
    const { error } = await supabase().from("comment_reports").insert({ comment_id: id, reporter_id: user.id, reason });
    if (!error || error.code === "23505") {
      setReported((s) => new Set(s).add(id));
      setReporting(null);
    }
  };

  const mineIds = new Set(mine.map((m) => m.id));
  const waiting = mine.filter((m) => m.status === "pending");

  return (
    <section className="mt-12" aria-labelledby={`comments-${targetType}`}>
      <h2 id={`comments-${targetType}`} className="font-display text-xl font-semibold text-ink">
        Comments &amp; photos
      </h2>

      {!user ? (
        <p className="mt-3 text-sm text-ink-muted">
          <button type="button" onClick={() => signIn(`Sign in to comment on ${subject} and share photos.`)} className="text-matcha underline hover:text-forest">
            Sign in
          </button>{" "}
          to join the conversation and share your photos.
        </p>
      ) : (
        <div className="mt-4">
          <label htmlFor={`comment-${targetType}`} className="block text-sm font-medium text-ink">
            Add a comment about {subject}
          </label>
          <textarea
            id={`comment-${targetType}`}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            rows={3}
            placeholder="Tips, how you prepare it, where you bought it, how it compares…"
            className="mt-2 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
          />
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={src} alt={`Selected photo ${i + 1}`} className="h-20 w-20 rounded-sm border border-line object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                    aria-label={`Remove photo ${i + 1}`}
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
              Add photos ({files.length}/{MAX_PHOTOS})
            </label>
            <button
              type="button"
              onClick={post}
              disabled={busy || !text.trim()}
              className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-forest disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post"}
            </button>
            <span className="text-xs text-ink-faint tabular-nums">
              {text.trim().length}/{MAX_CHARS}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Keep it about the matcha. No ads, links or personal information, and no photos of other people.</p>
        </div>
      )}
      {message && (
        <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
          {message}
        </p>
      )}

      {waiting.map((c) => (
        <article key={c.id} className="mt-4 rounded-sm border border-line bg-paper-raised px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Your comment &middot; awaiting approval</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{c.body}</p>
          <Photos paths={c.photos} who="you" />
          <button type="button" onClick={() => void remove(c)} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
            Delete
          </button>
        </article>
      ))}

      <div className="mt-6 flex flex-col gap-5">
        {pub === null && <p className="text-sm text-ink-faint">Loading comments…</p>}
        {pub?.length === 0 && waiting.length === 0 && <p className="text-sm text-ink-muted">No comments yet. Start the conversation.</p>}
        {pub?.map((c) => (
          <article key={c.id} className="border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {c.public_profile ? (
                <Link href={`/u/${encodeURIComponent(c.display_name)}`} className="text-sm font-medium text-ink hover:text-matcha">
                  {c.display_name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-ink">{c.display_name}</span>
              )}
              <TierBadge tier={c.tier} />
              <span className="text-xs text-ink-faint">{dateFmt.format(new Date(c.created_at))}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-ink leading-relaxed">{c.body}</p>
            <Photos paths={c.photos} who={c.display_name} />
            <div className="mt-2 text-xs text-ink-faint">
              {mineIds.has(c.id) ? (
                <button type="button" onClick={() => void remove(mine.find((m) => m.id === c.id)!)} className="underline hover:text-ink-muted">
                  Delete
                </button>
              ) : reported.has(c.id) ? (
                "Thanks, we'll take a look."
              ) : reporting === c.id ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  Why?
                  {REPORT_REASONS.map((reason) => (
                    <button key={reason} type="button" onClick={() => void report(c.id, reason)} className="rounded-full border border-line-strong px-2.5 py-0.5 hover:bg-matcha-soft">
                      {reason}
                    </button>
                  ))}
                  <button type="button" onClick={() => setReporting(null)} className="underline">
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => (user ? setReporting(c.id) : signIn("Sign in to report a comment."))} className="underline hover:text-ink-muted">
                  Report
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
