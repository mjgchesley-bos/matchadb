"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { commentPhotoUrl } from "@/components/Comments";
import { supabase } from "@/lib/supabase";

// Staff-only activity log (/admin). Members post, rate and upload in real time with no approval step; this page is where
// the owner watches what they do and can open and hide any comment or review. Everything comes from staff-only database
// functions (supabase/admin_activity.sql), so a visitor or ordinary member who finds this URL just sees "staff only".
// English only on purpose: it is an internal tool.

type Ev = { at: string; kind: string; member: string; ref: string | null; txt: string | null; target_type: string | null; target_key: string | null; photos: number; status: string | null };
type MemberEv = Omit<Ev, "member">;
type Summary = { totals: Record<string, number>; photos: number; active_members: number; by_day: { day: string; counts: Record<string, number> }[] };
type MemberRow = { name: string; email: string; joined: string; last_sign_in: string | null; public: boolean; ratings: number; reviews: number; comments: number; photos: number; saves: number; following: number; followers: number; days: number };
type MemberDetail = { name: string; email: string; joined: string; last_sign_in: string | null; public: boolean; findable: boolean; bio: string; provider: string | null; events: MemberEv[] };
type Item = {
  kind: string; id: string; at: string; member?: string; target_type?: string; target_key?: string; body?: string; photos?: string[]; status?: string;
  reports?: { reason: string; by: string; at: string }[]; report_reason?: string; report_by?: string; report_at?: string;
  name?: string; address?: string; link?: string; note?: string; profile?: string;
};

const KINDS: Record<string, { label: string; tone: string }> = {
  account: { label: "New account", tone: "bg-gold-soft text-gold" },
  comment: { label: "Comment", tone: "bg-matcha-soft text-forest" },
  review: { label: "Review", tone: "bg-matcha-soft text-forest" },
  rating: { label: "Product rating", tone: "bg-paper text-ink-muted border border-line" },
  cafe_rating: { label: "Café rating", tone: "bg-paper text-ink-muted border border-line" },
  save: { label: "Save", tone: "bg-paper text-ink-muted border border-line" },
  shelf: { label: "Shelf", tone: "bg-paper text-ink-muted border border-line" },
  list: { label: "List add", tone: "bg-paper text-ink-muted border border-line" },
  follow: { label: "Follow", tone: "bg-paper text-ink-muted border border-line" },
  bookmark: { label: "Study saved", tone: "bg-paper text-ink-muted border border-line" },
  suggestion: { label: "Café suggestion", tone: "bg-gold-soft text-gold" },
  report: { label: "Report", tone: "bg-red-100 text-red-800" },
  visit: { label: "Visit", tone: "bg-paper text-ink-faint border border-line" },
};
const FEED_KINDS = Object.keys(KINDS).filter((k) => k !== "visit");

const RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function rangeBounds(k: RangeKey): { from: Date; to: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = 86400000;
  const tomorrow = new Date(start.getTime() + day);
  if (k === "today") return { from: start, to: tomorrow };
  if (k === "yesterday") return { from: new Date(start.getTime() - day), to: start };
  if (k === "7d") return { from: new Date(start.getTime() - 6 * day), to: tomorrow };
  if (k === "30d") return { from: new Date(start.getTime() - 29 * day), to: tomorrow };
  return { from: new Date("2000-01-01"), to: new Date(tomorrow.getTime() + 365 * day) };
}

const when = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
const snip = (s: string | null | undefined, n = 160) => (s && s.length > n ? `${s.slice(0, n).trim()}…` : s ?? "");

type Names = { products: Record<string, { name: string; brand: string }>; cafes: Record<string, { name: string; city: string; slug: string }> };

function targetOf(e: { target_type: string | null; target_key: string | null }, names: Names): { label: string; href?: string } | null {
  const { target_type: t, target_key: k } = e;
  if (!t || !k) return null;
  if (t === "product") {
    const p = names.products[k];
    return { label: p ? `${p.name}${p.brand ? ` (${p.brand})` : ""}` : `product #${k}`, href: `/products/${k}` };
  }
  if (t === "cafe") {
    const c = names.cafes[k];
    return { label: c ? `${c.name}${c.city && !c.name.toLowerCase().includes(c.city.toLowerCase()) ? `, ${c.city}` : ""}` : `café ${k}`, href: c ? `/cafes/${c.slug}` : undefined };
  }
  if (t === "brand") return { label: k, href: `/brands/${encodeURIComponent(k)}` };
  if (t === "member") return { label: k };
  if (t === "study") return { label: `study #${k}`, href: `/research/${k}` };
  return { label: k };
}

function describe(e: { kind: string; txt: string | null; target_type: string | null; target_key: string | null; photos: number; status: string | null }, names: Names): { verb: string; target: ReturnType<typeof targetOf>; body?: string } {
  const target = targetOf(e, names);
  switch (e.kind) {
    case "account": return { verb: "created an account", target: null };
    case "visit": return { verb: "visited the site", target: null };
    case "review": return { verb: "reviewed", target, body: e.txt ?? undefined };
    case "comment": return { verb: e.photos ? `commented with ${e.photos} photo${e.photos > 1 ? "s" : ""} on` : "commented on", target, body: e.txt ?? undefined };
    case "rating": return { verb: `rated ${e.txt}★`, target };
    case "cafe_rating": return { verb: `rated ${e.txt}★`, target };
    case "save": return { verb: "saved", target };
    case "shelf": return { verb: `put on shelf (${e.txt})`, target };
    case "list": return { verb: `added to list “${e.txt}”`, target };
    case "follow": return { verb: "followed", target };
    case "bookmark": return { verb: "saved a research paper", target };
    case "report": return { verb: `reported a ${e.target_type}${e.txt ? `: “${e.txt}”` : ""}`, target: e.target_type === "profile" ? targetOf({ target_type: "member", target_key: e.target_key }, names) : null };
    case "suggestion": return { verb: `suggested a café${e.status ? ` (${e.status})` : ""}`, target: null, body: e.txt ?? undefined };
    default: return { verb: e.kind, target };
  }
}

const itemKind = (e: { kind: string; target_type: string | null }): string | null => {
  if (e.kind === "comment" || e.kind === "review" || e.kind === "suggestion") return e.kind;
  if (e.kind === "report" && (e.target_type === "comment" || e.target_type === "review" || e.target_type === "profile")) return `report-${e.target_type}`;
  return null;
};

function Chip({ kind }: { kind: string }) {
  const k = KINDS[kind] ?? { label: kind, tone: "bg-paper text-ink-muted border border-line" };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${k.tone}`}>{k.label}</span>;
}

function EventRow({ e, member, names, onItem, onMember }: { e: MemberEv; member?: string; names: Names; onItem: (kind: string, ref: string) => void; onMember: (name: string) => void }) {
  const d = describe(e, names);
  const ik = itemKind(e);
  const clickable = !!(ik && e.ref);
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Chip kind={e.kind} />
        {member && (
          <button type="button" onClick={(ev) => { ev.stopPropagation(); onMember(member); }} className="text-sm font-semibold text-matcha hover:text-forest hover:underline">
            {member}
          </button>
        )}
        <span className="text-sm text-ink-muted">{d.verb}</span>
        {d.target && (d.target.href ? (
          <Link href={d.target.href} onClick={(ev) => ev.stopPropagation()} className="text-sm text-ink underline decoration-line-strong hover:text-matcha">{d.target.label}</Link>
        ) : (
          <span className="text-sm text-ink">{d.target.label}</span>
        ))}
        {e.status === "hidden" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.7rem] font-medium text-red-800">hidden</span>}
        <span className="ml-auto whitespace-nowrap text-xs text-ink-faint" title={when(e.at)}>{ago(e.at)}</span>
      </div>
      {d.body && <p className="mt-1 text-sm leading-relaxed text-ink">{snip(d.body, 220)}</p>}
    </>
  );
  return (
    <li>
      {clickable ? (
        <button type="button" onClick={() => onItem(ik as string, e.ref as string)} className="block w-full px-4 py-3 text-left hover:bg-matcha-soft/60">
          {inner}
        </button>
      ) : (
        <div className="px-4 py-3">{inner}</div>
      )}
    </li>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 px-4 py-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-2xl rounded-md border border-line bg-paper-raised p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-muted hover:bg-matcha-soft">Close</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ItemModal({ kind, refId, names, onClose, onMember, onChanged }: { kind: string; refId: string; names: Names; onClose: () => void; onMember: (n: string) => void; onChanged: () => void }) {
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase().rpc("admin_item", { p_kind: kind, p_ref: refId });
    setItem((data as Item | null) ?? null);
  }, [kind, refId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the item being opened
    void load();
  }, [load]);

  const setStatus = async (status: "approved" | "hidden") => {
    if (!item) return;
    setBusy(true);
    await supabase().rpc("admin_set_status", { p_kind: item.kind, p_ref: item.id, p_status: status });
    await load();
    onChanged();
    setBusy(false);
  };

  const title = item?.kind === "comment" ? "Comment" : item?.kind === "review" ? "Review" : item?.kind === "suggestion" ? "Café suggestion" : item?.kind === "report-profile" ? "Profile report" : "Item";
  const target = item && item.target_type ? targetOf({ target_type: item.target_type, target_key: item.target_key ?? null }, names) : null;
  return (
    <Modal onClose={onClose} title={item === undefined ? "Loading…" : item === null ? "Not found" : title}>
      {item === null && <p className="text-sm text-ink-muted">This item no longer exists (the member may have deleted it).</p>}
      {item && (
        <div className="flex flex-col gap-4">
          {item.report_reason && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <strong>Reported</strong> by {item.report_by} · {item.report_at ? when(item.report_at) : ""}: “{item.report_reason}”
            </div>
          )}
          <p className="text-sm text-ink-muted">
            {item.member && (
              <button type="button" onClick={() => onMember(item.member as string)} className="font-semibold text-matcha hover:text-forest hover:underline">{item.member}</button>
            )}{" "}
            · {when(item.at)}
            {target && (
              <>
                {" "}· on{" "}
                {target.href ? <Link href={target.href} className="text-ink underline hover:text-matcha">{target.label}</Link> : <span className="text-ink">{target.label}</span>}
              </>
            )}
            {item.status && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${item.status === "hidden" ? "bg-red-100 text-red-800" : "bg-matcha-soft text-forest"}`}>{item.status}</span>
            )}
          </p>
          {item.kind === "suggestion" ? (
            <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-faint">Café</dt><dd className="text-ink">{item.name}</dd>
              <dt className="text-ink-faint">Address</dt><dd className="text-ink">{item.address}</dd>
              <dt className="text-ink-faint">Link</dt><dd className="break-all text-ink">{item.link || "—"}</dd>
              <dt className="text-ink-faint">Status</dt><dd className="text-ink">{item.status}{item.note ? ` — ${item.note}` : ""}</dd>
            </dl>
          ) : item.body ? (
            <p className="whitespace-pre-line text-base leading-relaxed text-ink">{item.body}</p>
          ) : null}
          {item.photos && item.photos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {item.photos.map((p) => (
                <a key={p} href={commentPhotoUrl(p)} target="_blank" rel="noopener noreferrer" data-notrack>
                  {/* eslint-disable-next-line @next/next/no-img-element -- member photo from storage */}
                  <img src={commentPhotoUrl(p)} alt="Member photo" className="max-h-64 w-auto max-w-full rounded-sm border border-line" />
                </a>
              ))}
            </div>
          )}
          {item.reports && item.reports.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Reports on this item ({item.reports.length})</h3>
              <ul className="mt-1 text-sm text-ink">
                {item.reports.map((r, i) => (
                  <li key={i}>{r.by} · {when(r.at)}: “{r.reason}”</li>
                ))}
              </ul>
            </div>
          )}
          {(item.kind === "comment" || item.kind === "review") && (
            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              {item.status === "hidden" ? (
                <button type="button" disabled={busy} onClick={() => void setStatus("approved")} className="rounded-full bg-matcha px-4 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-60">Show again</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void setStatus("hidden")} className="rounded-full border border-red-700 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-60">Hide from the site</button>
              )}
              <span className="self-center text-xs text-ink-faint">Hiding removes it from the public page right away; the member can still see their own copy.</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function MemberModal({ name, names, onClose, onItem }: { name: string; names: Names; onClose: () => void; onItem: (kind: string, ref: string) => void }) {
  const [m, setM] = useState<MemberDetail | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    supabase().rpc("admin_member", { p_name: name }).then(({ data }) => live && setM((data as MemberDetail | null) ?? null));
    return () => {
      live = false;
    };
  }, [name]);
  return (
    <Modal onClose={onClose} title={name}>
      {m === undefined && <p className="text-sm text-ink-muted">Loading…</p>}
      {m === null && <p className="text-sm text-ink-muted">No such member.</p>}
      {m && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-faint">Email</dt><dd className="break-all text-ink">{m.email}</dd>
            <dt className="text-ink-faint">Joined</dt><dd className="text-ink">{when(m.joined)}</dd>
            <dt className="text-ink-faint">Last sign-in</dt><dd className="text-ink">{m.last_sign_in ? `${when(m.last_sign_in)} (${ago(m.last_sign_in)})` : "never"}</dd>
            <dt className="text-ink-faint">Profile</dt><dd className="text-ink">{m.public ? <Link href={`/u/${encodeURIComponent(m.name)}`} className="text-matcha underline">public page</Link> : "private"}{m.findable ? " · findable by name/email" : ""}</dd>
            {m.bio && (<><dt className="text-ink-faint">Bio</dt><dd className="text-ink">{m.bio}</dd></>)}
          </dl>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Latest activity</h3>
            {m.events.length === 0 ? <p className="mt-1 text-sm text-ink-muted">Nothing yet.</p> : (
              <ul className="mt-1 divide-y divide-line rounded-sm border border-line bg-paper">
                {m.events.map((e, i) => <EventRow key={`${e.kind}-${e.at}-${i}`} e={e} names={names} onItem={onItem} onMember={() => {}} />)}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdminClient() {
  const { user, ready, signIn } = useAuth();
  const [staff, setStaff] = useState<boolean | null>(null);
  const [range, setRange] = useState<RangeKey>("today");
  const [tab, setTab] = useState<"activity" | "members">("activity");
  const [kinds, setKinds] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [feed, setFeed] = useState<Ev[] | null>(null);
  const [more, setMore] = useState(false);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [q, setQ] = useState("");
  const [names, setNames] = useState<Names>({ products: {}, cafes: {} });
  const [item, setItem] = useState<{ kind: string; ref: string } | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const LIMIT = 100;

  useEffect(() => {
    if (!user) return;
    let live = true;
    supabase().rpc("is_staff").then(({ data }) => live && setStaff(!!data));
    return () => {
      live = false;
    };
  }, [user]);

  // Refresh by itself every minute while the page is open.
  useEffect(() => {
    if (!staff) return;
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [staff]);

  const kindFilter = useMemo(() => (kinds.length ? kinds : FEED_KINDS), [kinds]);

  useEffect(() => {
    if (!staff) return;
    let live = true;
    const { from, to } = rangeBounds(range);
    (async () => {
      const sb = supabase();
      const [s, f] = await Promise.all([
        sb.rpc("admin_summary", { p_from: from.toISOString(), p_to: to.toISOString() }),
        sb.rpc("admin_feed", { p_from: from.toISOString(), p_to: to.toISOString(), p_kinds: kindFilter, p_limit: LIMIT, p_user: null }),
      ]);
      if (!live) return;
      setSummary((s.data as Summary) ?? null);
      const rows = (f.data as Ev[]) ?? [];
      setFeed(rows);
      setMore(rows.length === LIMIT);
      setUpdated(new Date());
    })();
    return () => {
      live = false;
    };
  }, [staff, range, kindFilter, tick]);

  useEffect(() => {
    if (!staff || tab !== "members") return;
    let live = true;
    const timer = setTimeout(() => {
      supabase()
        .rpc("admin_members", { p_q: q.trim() || null, p_limit: 200, p_offset: 0 })
        .then(({ data }) => live && setMembers((data as MemberRow[]) ?? []));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [staff, tab, q, tick]);

  const loadOlder = async () => {
    if (!feed || feed.length === 0) return;
    const { from } = rangeBounds(range);
    const { data } = await supabase().rpc("admin_feed", { p_from: from.toISOString(), p_to: feed[feed.length - 1].at, p_kinds: kindFilter, p_limit: LIMIT, p_user: null });
    const rows = (data as Ev[]) ?? [];
    setFeed([...feed, ...rows]);
    setMore(rows.length === LIMIT);
  };

  // Names for the product and café ids that appear in the feed.
  const wanted = useMemo(() => {
    const p = new Set<string>();
    const c = new Set<string>();
    for (const e of feed ?? []) {
      if (e.target_type === "product" && e.target_key && !names.products[e.target_key]) p.add(e.target_key);
      if (e.target_type === "cafe" && e.target_key && !names.cafes[e.target_key]) c.add(e.target_key);
    }
    return { p: [...p].slice(0, 100), c: [...c].slice(0, 100) };
  }, [feed, names]);
  useEffect(() => {
    if (wanted.p.length === 0 && wanted.c.length === 0) return;
    let live = true;
    (async () => {
      const add: Names = { products: {}, cafes: {} };
      if (wanted.p.length) {
        const r = (await (await fetch(`/api/products/lookup?ids=${wanted.p.join(",")}`)).json()) as { id: number; name: string; brand: string }[];
        for (const x of r) add.products[String(x.id)] = { name: x.name, brand: x.brand };
      }
      if (wanted.c.length) {
        const r = (await (await fetch(`/api/cafes/lookup?ids=${wanted.c.join(",")}`)).json()) as { id: string; name: string; city: string; slug: string }[];
        for (const x of r) add.cafes[x.id] = { name: x.name, city: x.city, slug: x.slug };
      }
      if (live) setNames((n) => ({ products: { ...n.products, ...add.products }, cafes: { ...n.cafes, ...add.cafes } }));
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [wanted]);

  if (!ready) return <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 text-sm text-ink-muted">Loading…</main>;
  if (!user)
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Activity log</h1>
        <p className="mt-3 text-ink-muted">Sign in with your staff account to continue.</p>
        <button type="button" onClick={() => signIn("Sign in to open the activity log")} className="mt-4 rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest">Sign in</button>
      </main>
    );
  if (staff === null) return <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 text-sm text-ink-muted">Checking access…</main>;
  if (!staff)
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Staff only</h1>
        <p className="mt-3 text-ink-muted">This page is for MatchaDB staff.</p>
      </main>
    );

  const t = summary?.totals ?? {};
  const n = (...ks: string[]) => ks.reduce((a, k) => a + (t[k] ?? 0), 0);
  const cards: { label: string; value: number; alert?: boolean; kinds?: string[] }[] = [
    { label: "New accounts", value: n("account"), kinds: ["account"] },
    { label: "Active members", value: summary?.active_members ?? 0 },
    { label: "Comments", value: n("comment"), kinds: ["comment"] },
    { label: "Photos", value: summary?.photos ?? 0, kinds: ["comment"] },
    { label: "Reviews", value: n("review"), kinds: ["review"] },
    { label: "Ratings", value: n("rating", "cafe_rating"), kinds: ["rating", "cafe_rating"] },
    { label: "Saves & shelves", value: n("save", "shelf", "list"), kinds: ["save", "shelf", "list"] },
    { label: "Follows", value: n("follow"), kinds: ["follow"] },
    { label: "Suggestions", value: n("suggestion"), kinds: ["suggestion"] },
    { label: "Reports", value: n("report"), alert: n("report") > 0, kinds: ["report"] },
  ];
  const DAYCOLS: [string, string[]][] = [["Accounts", ["account"]], ["Comments", ["comment"]], ["Photos", ["photos"]], ["Reviews", ["review"]], ["Ratings", ["rating", "cafe_rating"]], ["Saves", ["save", "shelf", "list"]], ["Reports", ["report"]]];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Staff only</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Activity log</h1>
        </div>
        <p className="text-xs text-ink-faint">{updated ? `Updated ${updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · refreshes every minute` : ""}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r.key} type="button" onClick={() => setRange(r.key)} className={`rounded-full border px-4 py-1.5 text-sm ${range === r.key ? "border-matcha bg-matcha text-paper" : "border-line-strong text-ink-muted hover:bg-matcha-soft"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Summary">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => { if (c.kinds) { setKinds(c.kinds); setTab("activity"); } }}
            className={`rounded-sm border px-3 py-3 text-left ${c.alert ? "border-red-300 bg-red-50" : "border-line bg-paper-raised"} ${c.kinds ? "hover:border-matcha" : "cursor-default"}`}
          >
            <span className="block text-xs uppercase tracking-wide text-ink-faint">{c.label}</span>
            <span className={`mt-0.5 block font-display text-2xl font-semibold tabular-nums ${c.alert ? "text-red-800" : "text-ink"}`}>{c.value}</span>
          </button>
        ))}
      </section>

      {summary && summary.by_day.length > 0 && range !== "today" && (
        <section className="mt-6 overflow-x-auto" aria-label="By day">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Day</th>
                {DAYCOLS.map(([label]) => <th key={label} className="px-2 py-2 text-right font-medium">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {summary.by_day.slice(0, 31).map((d) => (
                <tr key={d.day} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-ink">{new Date(`${d.day}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</td>
                  {DAYCOLS.map(([label, ks]) => {
                    const v = ks.reduce((a, k) => a + (d.counts[k] ?? 0), 0);
                    return <td key={label} className={`px-2 py-1.5 text-right tabular-nums ${v ? "text-ink" : "text-ink-faint/60"} ${label === "Reports" && v ? "font-semibold text-red-800" : ""}`}>{v || "·"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="mt-8 flex gap-5 border-b border-line" role="tablist">
        {(["activity", "members"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 pb-2 text-sm font-medium ${tab === k ? "border-matcha text-ink" : "border-transparent text-ink-faint hover:text-ink-muted"}`}>
            {k === "activity" ? "Activity feed" : "Members"}
          </button>
        ))}
      </div>

      {tab === "activity" && (
        <section className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setKinds([])} className={`rounded-full border px-3 py-1 text-xs ${kinds.length === 0 ? "border-matcha bg-matcha-soft text-forest" : "border-line-strong text-ink-muted hover:bg-matcha-soft"}`}>Everything</button>
            {FEED_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))} className={`rounded-full border px-3 py-1 text-xs ${kinds.includes(k) ? "border-matcha bg-matcha-soft text-forest" : "border-line-strong text-ink-muted hover:bg-matcha-soft"}`}>
                {KINDS[k].label}
              </button>
            ))}
          </div>
          {feed === null ? (
            <p className="mt-4 text-sm text-ink-faint">Loading…</p>
          ) : feed.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Nothing in this range.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-paper-raised">
              {feed.map((e, i) => (
                <EventRow key={`${e.kind}-${e.at}-${e.member}-${i}`} e={e} member={e.member} names={names} onItem={(kind, ref) => setItem({ kind, ref })} onMember={setMemberName} />
              ))}
            </ul>
          )}
          {more && (
            <button type="button" onClick={() => void loadOlder()} className="mt-3 rounded-full border border-line-strong px-4 py-1.5 text-sm text-ink-muted hover:bg-matcha-soft">Load older</button>
          )}
        </section>
      )}

      {tab === "members" && (
        <section className="mt-4">
          <label htmlFor="adm-q" className="sr-only">Search members</label>
          <input id="adm-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username or email" className="w-full max-w-sm rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-matcha" />
          {members === null ? (
            <p className="mt-4 text-sm text-ink-faint">Loading…</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-medium">Member</th>
                    <th className="px-2 py-2 font-medium">Joined</th>
                    <th className="px-2 py-2 font-medium">Last seen</th>
                    <th className="px-2 py-2 text-right font-medium">Ratings</th>
                    <th className="px-2 py-2 text-right font-medium">Reviews</th>
                    <th className="px-2 py-2 text-right font-medium">Comments</th>
                    <th className="px-2 py-2 text-right font-medium">Photos</th>
                    <th className="px-2 py-2 text-right font-medium">Saves</th>
                    <th className="px-2 py-2 text-right font-medium">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.name} className="border-b border-line/60 hover:bg-matcha-soft/50">
                      <td className="py-2 pr-3">
                        <button type="button" onClick={() => setMemberName(m.name)} className="font-semibold text-matcha hover:text-forest hover:underline">{m.name}</button>
                        <span className="block text-xs text-ink-faint">{m.email}</span>
                      </td>
                      <td className="px-2 py-2 text-ink-muted">{new Date(m.joined).toLocaleDateString([], { month: "short", day: "numeric" })}</td>
                      <td className="px-2 py-2 text-ink-muted">{m.last_sign_in ? ago(m.last_sign_in) : "never"}</td>
                      {[m.ratings, m.reviews, m.comments, m.photos, m.saves, m.days].map((v, i) => <td key={i} className={`px-2 py-2 text-right tabular-nums ${v ? "text-ink" : "text-ink-faint/60"}`}>{v || "·"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {item && <ItemModal kind={item.kind} refId={item.ref} names={names} onClose={() => setItem(null)} onMember={(nm) => { setItem(null); setMemberName(nm); }} onChanged={() => setTick((x) => x + 1)} />}
      {memberName && <MemberModal name={memberName} names={names} onClose={() => setMemberName(null)} onItem={(kind, ref) => { setMemberName(null); setItem({ kind, ref }); }} />}
    </main>
  );
}

// A small link on My matcha, shown only to staff.
export function StaffLink() {
  const { user } = useAuth();
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    if (!user) return;
    let live = true;
    supabase().rpc("is_staff").then(({ data }) => live && setStaff(!!data));
    return () => {
      live = false;
    };
  }, [user]);
  if (!staff) return null;
  return (
    <p className="mt-4 text-sm">
      <Link href="/admin" className="rounded-full border border-matcha px-4 py-1.5 font-medium text-matcha hover:bg-matcha-soft">Open the activity log (staff)</Link>
    </p>
  );
}
