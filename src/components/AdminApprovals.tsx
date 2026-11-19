"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useState } from "react";
import { commentPhotoUrl } from "@/components/Comments";
import { supabase } from "@/lib/supabase";

// The staff approvals queue: everything waiting for a decision, pre-reviewed automatically so the common case is one click.
// Verdicts: "valid" (green) = the checks that can be made automatically all agree; "look" (amber) = nothing wrong, but it cannot be proved
// automatically; "flag" (red) = something does not add up. The reasons are always shown.
type Req = {
  id: string; created_at: string; kind: "cafe_owner" | "wholesaler"; business: string; website: string | null; cafe_id: string | null; note: string | null;
  user_id: string; member: string; member_since: string; email: string | null; provider: string | null; full_name: string | null;
  ratings: number; comments: number; cafe_has_owner: boolean;
};
type Cmt = { id: string; created_at: string; member: string; target_type: string; target_key: string; body: string; photos: string[] };
type Rev = { id: string; created_at: string; member: string; product_id: number; body: string };
type Queue = { requests: Req[]; comments: Cmt[]; reviews: Rev[]; events: number; event_photos: number };
type Match = { id: string; name: string; city: string; cc: string; host: string | null; score: number; slug: string };
type Verdict = { level: "valid" | "look" | "flag"; reasons: string[]; matches: Match[]; cafeId: string | null };

const FREE = new Set(["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "me.com", "live.com", "aol.com", "proton.me", "protonmail.com", "msn.com", "gmx.com", "mail.com"]);
const host = (u: string | null) => {
  try {
    return u ? new URL(/^https?:/.test(u) ? u : "https://" + u).hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
};
const root = (h: string) => h.split(".").slice(-2).join(".");
const tok = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const chip = { valid: "border-matcha bg-matcha-soft text-forest", look: "border-amber-500 bg-amber-100 text-amber-950", flag: "border-red-700 bg-red-100 text-red-900" } as const;
const label = { valid: "Looks valid", look: "Take a look", flag: "Red flag" } as const;
const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 90 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

async function review(r: Req): Promise<Verdict> {
  const reasons: string[] = [];
  let level = "valid" as Verdict["level"];
  const bump = (to: Verdict["level"]) => { if (to === "flag" || (to === "look" && level === "valid")) level = to; };
  const domain = (r.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const free = FREE.has(domain);
  const given = host(r.website);
  let matches: Match[] = [];
  if (r.kind === "cafe_owner") {
    try {
      matches = (await fetch(`/api/cafes/match?name=${encodeURIComponent(r.business)}`).then((x) => x.json())) as Match[];
    } catch {
      matches = [];
    }
  }
  const best = matches[0] ?? null;
  const cafeId = r.cafe_id ?? (matches.length === 1 || (best && best.score >= 0.95 && (matches[1]?.score ?? 0) < 0.9) ? best?.id ?? null : null);
  const target = cafeId ? matches.find((m) => m.id === cafeId) ?? null : null;
  if (r.cafe_has_owner) { reasons.push("This café already has an owner account."); bump("flag"); }
  // 1. sign-in email vs a website we know for the business
  const known = given ?? target?.host ?? null;
  if (!free && domain) {
    if (known && root(known) === root(domain)) reasons.push(`Signed up with a ${domain} address that matches the business website (${known}).`);
    else if (known) { reasons.push(`Email is at ${domain}, but the business website is ${known}.`); bump("flag"); }
    else { reasons.push(`Signed up with a ${domain} address; no website to compare it with.`); bump("look"); }
  } else if (free) {
    reasons.push(`Free email (${domain || "unknown"}), so the email can't prove ownership.`);
    bump("look");
  }
  // 2. Google account name vs business name
  if (r.full_name) {
    const a = tok(r.full_name), b = tok(r.business);
    if (a && b && (a === b || a.includes(b) || b.includes(a))) reasons.push(`The Google account name ("${r.full_name}") matches the business name.`);
  }
  // 3. is there a café of that name on the map
  if (r.kind === "cafe_owner") {
    if (target) reasons.push(`Matches a café on the map: ${target.name}, ${target.city}.`);
    else if (matches.length > 1) { reasons.push(`${matches.length} cafés on the map have a similar name (${matches.slice(0, 3).map((m) => m.city).join(", ")}). Pick the right one.`); bump("look"); }
    else { reasons.push("No café with this name is on the map."); bump("look"); }
  } else {
    if (!given) { reasons.push("No website given for the wholesaler."); bump("look"); }
  }
  // 4. website given but different from the café's own site
  if (given && target?.host && root(given) !== root(target.host)) { reasons.push(`The website given (${given}) differs from the café's site (${target.host}).`); bump("look"); }
  // 5. a note, brand-new empty account
  if (!r.note) reasons.push("No note from the requester.");
  if (r.ratings + r.comments === 0) reasons.push("No other activity on the account yet (normal for a new owner).");
  // a free email that otherwise lines up perfectly stays "take a look": say what would settle it
  if (level === "look" && free) reasons.push("To settle it: message them from the café's own Instagram or email, or check the page links back to this account.");
  return { level, reasons, matches, cafeId };
}

function RequestCard({ r, onDone }: { r: Req; onDone: () => void }) {
  const [v, setV] = useState<Verdict | null>(null);
  const [cafe, setCafe] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void review(r).then((x) => { if (live) { setV(x); setCafe(x.cafeId ?? ""); } });
    return () => { live = false; };
  }, [r]);
  const decide = async (approve: boolean) => {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase().rpc("admin_decide_request", { p_id: r.id, p_approve: approve, p_cafe_id: approve && r.kind === "cafe_owner" ? cafe || null : null });
    setBusy(false);
    if (error || !data) setMsg("That didn't go through. Reload and try again.");
    else onDone();
  };
  return (
    <li className="rounded-sm border-2 border-line bg-paper-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-ink">
          <span className="mr-2 rounded-full bg-matcha px-2.5 py-0.5 text-xs text-paper">{r.kind === "cafe_owner" ? "Café owner" : "Wholesaler"}</span>
          {r.business}
        </p>
        {v && <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${chip[v.level]}`}>{label[v.level]}</span>}
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Member <Link href={`/u/${encodeURIComponent(r.member)}`} className="text-matcha underline">{r.member}</Link> · asked {ago(r.created_at)} · on the site since {new Date(r.member_since).toLocaleDateString()}
        {r.email ? ` · ${r.email}` : ""} {r.provider ? `(${r.provider})` : ""}
      </p>
      {(r.website || r.note) && (
        <p className="mt-1 text-sm text-ink-muted">
          {r.website && <>Website: <a href={/^https?:/.test(r.website) ? r.website : "https://" + r.website} target="_blank" rel="noopener noreferrer" className="text-matcha underline">{r.website}</a> </>}
          {r.note && <>· Note: “{r.note}”</>}
        </p>
      )}
      {v === null ? <p className="mt-3 text-sm text-ink-faint">Reviewing…</p> : (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-ink-muted">
          {v.reasons.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true">•</span><span>{x}</span></li>)}
        </ul>
      )}
      {v && r.kind === "cafe_owner" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor={`cafe-${r.id}`} className="text-ink-muted">Link to café:</label>
          <select id={`cafe-${r.id}`} value={cafe} onChange={(e) => setCafe(e.target.value)} className="rounded-sm border border-line-strong bg-paper px-2 py-1.5 text-sm">
            <option value="">(none yet)</option>
            {v.matches.map((m) => <option key={m.id} value={m.id}>{m.name}, {m.city}</option>)}
          </select>
          {cafe && v.matches.find((m) => m.id === cafe) && <Link href={`/cafes/${v.matches.find((m) => m.id === cafe)!.slug}`} className="text-matcha underline">Open its page</Link>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || v === null} onClick={() => void decide(true)} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">Approve</button>
        <button type="button" disabled={busy || v === null} onClick={() => void decide(false)} className="rounded-full border border-line-strong px-5 py-2 text-sm text-ink hover:bg-matcha-soft disabled:opacity-50">Decline</button>
        {msg && <span className="text-sm text-red-800">{msg}</span>}
      </div>
    </li>
  );
}

const SPAM = /(https?:\/\/|www\.|\.com\b|@\w+\.\w+|\+?\d[\d\s().-]{8,}|whatsapp|telegram|crypto|casino|loan|seo\b)/i;
function ContentCard({ kind, id, who, when, where, body, photos, onDone }: { kind: "comment" | "review"; id: string; who: string; when: string; where: string; body: string; photos?: string[]; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const flags = [SPAM.test(body) ? "Contains a link, email or phone number." : null, body.length > 20 && body === body.toUpperCase() ? "All capitals." : null, body.trim().length < 12 ? "Very short." : null].filter(Boolean) as string[];
  const level: Verdict["level"] = flags.length ? "look" : "valid";
  const set = async (status: "approved" | "hidden") => {
    setBusy(true);
    await supabase().rpc("admin_set_status", { p_kind: kind, p_ref: id, p_status: status });
    setBusy(false);
    onDone();
  };
  return (
    <li className="rounded-sm border-2 border-line bg-paper-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink"><span className="mr-2 rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-ink-muted">{kind === "comment" ? "Comment with photos" : "Review"}</span><strong>{who}</strong> on {where} · {ago(when)}</p>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${chip[level]}`}>{label[level]}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-ink">{body}</p>
      {flags.length > 0 && <ul className="mt-2 text-sm text-amber-950">{flags.map((f) => <li key={f}>• {f}</li>)}</ul>}
      {photos && photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((p) => (
            <a key={p} href={commentPhotoUrl(p)} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- member photo awaiting approval */}
              <img src={commentPhotoUrl(p)} alt="Photo awaiting approval" loading="lazy" className="h-24 w-24 rounded-sm border border-line object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={busy} onClick={() => void set("approved")} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">Approve</button>
        <button type="button" disabled={busy} onClick={() => void set("hidden")} className="rounded-full border border-line-strong px-5 py-2 text-sm text-ink hover:bg-matcha-soft disabled:opacity-50">Hide</button>
      </div>
    </li>
  );
}

/** How many things are waiting (for the tab badge). */
export function useQueueCount(enabled: boolean): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () => supabase().rpc("admin_queue").then(({ data, error }) => {
      if (!live || error || !data) return;
      const q = data as Queue;
      setN(q.requests.length + q.events + q.event_photos);
    });
    void load();
    const id = setInterval(load, 60000);
    return () => { live = false; clearInterval(id); };
  }, [enabled]);
  return n;
}

export function AdminApprovals({ onOpenEvents }: { onOpenEvents: () => void }) {
  const [q, setQ] = useState<Queue | null | "error">(null);
  const load = useCallback(() => {
    void supabase().rpc("admin_queue").then(({ data, error }) => setQ(error || !data ? "error" : (data as Queue)));
  }, []);
  useEffect(load, [load]);
  if (q === null) return <p className="mt-4 text-sm text-ink-faint">Loading…</p>;
  if (q === "error") return <p className="mt-4 text-sm text-ink-muted">The queue isn&apos;t available yet. Run <code>supabase/admin_queue.sql</code> in the Supabase SQL editor once.</p>;
  const total = q.requests.length + q.events + q.event_photos;
  return (
    <section className="mt-4" aria-label="Approvals queue">
      {total === 0 ? (
        <p className="rounded-sm border-2 border-matcha bg-matcha-soft px-4 py-5 text-ink">Nothing is waiting for you.</p>
      ) : (
        <p className="text-sm text-ink-muted">{total} waiting. Each has been checked automatically; the green ones are one click. Comments, reviews, events and photos go live as soon as they are posted; hide anything from the Activity feed or Event posts.</p>
      )}
      {q.requests.length > 0 && (
        <div className="mt-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Business account requests ({q.requests.length})</h2>
          <ul className="mt-2 flex flex-col gap-3">{q.requests.map((r) => <RequestCard key={r.id} r={r} onDone={load} />)}</ul>
        </div>
      )}
      {(q.events > 0 || q.event_photos > 0) && (
        <div className="mt-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Events</h2>
          <div className="mt-2 rounded-sm border-2 border-line bg-paper-raised p-4 text-sm text-ink">
            {q.events} event{q.events === 1 ? "" : "s"} (a place we couldn't find automatically) and {q.event_photos} photo{q.event_photos === 1 ? "" : "s"} waiting.{" "}
            <button type="button" onClick={onOpenEvents} className="text-matcha underline hover:text-forest">Review them in the Event posts tab</button>
          </div>
        </div>
      )}
    </section>
  );
}
