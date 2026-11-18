"use client";

import { useMemo, useState } from "react";
import { CONFIDENCE_LABEL, type Continent, type EventKind, type MatchaEvent } from "@/lib/events";

// Matcha events with a search box (a city, country or event name) and a "Near me" button. Either one sorts the list by distance.
type Origin = { lat: number; lng: number; label: string } | null;
const KINDS: { key: EventKind | "all"; label: string }[] = [
  { key: "all", label: "All events" },
  { key: "festival", label: "Matcha festivals" },
  { key: "tea festival", label: "Tea festivals" },
  { key: "trade show", label: "Trade shows" },
  { key: "gathering", label: "Gatherings" },
  { key: "exhibition", label: "Exhibitions" },
];

const CONTINENTS: Continent[] = ["North America", "Europe", "Asia", "Oceania", "South America", "Africa"];
const slug = (c: string) => "cont-" + c.toLowerCase().replace(/\s+/g, "-");

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

export function EventsExplorer({ events, contactEmail }: { events: MatchaEvent[]; contactEmail: string }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<EventKind | "all">("all");
  const [origin, setOrigin] = useState<Origin>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = events.filter((e) => kind === "all" || e.kind === kind);
    // Text matches the event's own place and name; a typed city that matches nothing is handled by the distance sort instead.
    const textHits = term ? list.filter((e) => `${e.name} ${e.city} ${e.country} ${e.venue ?? ""}`.toLowerCase().includes(term)) : list;
    if (term && textHits.length > 0 && !origin) list = textHits;
    const withDist = list.map((e) => ({ e, d: origin ? km(origin, e) : null }));
    if (origin) withDist.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    return withDist;
  }, [events, q, kind, origin]);

  const groups = useMemo(() => {
    const out = CONTINENTS.map((c) => ({ c, list: rows.filter((r) => r.e.continent === c) })).filter((g) => g.list.length > 0);
    // With a place chosen, the continent holding the nearest event comes first.
    if (origin) out.sort((a, b) => Math.min(...a.list.map((r) => r.d ?? 0)) - Math.min(...b.list.map((r) => r.d ?? 0)));
    return out;
  }, [rows, origin]);

  const near = () => {
    setMsg(null);
    if (!navigator.geolocation) return setMsg("Your browser can't share a location. Type a city instead.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude, label: "your location" });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setMsg("We couldn't get your location. Allow it in your browser, or type a city instead.");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const v = q.trim();
    if (!v) { setOrigin(null); return; }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    setBusy(true);
    try {
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(v)}.json?types=place,locality,region,country&limit=1&access_token=${token}`);
      const j = (await r.json()) as { features?: { center: [number, number]; place_name: string }[] };
      const f = j.features?.[0];
      if (f) setOrigin({ lng: f.center[0], lat: f.center[1], label: f.place_name });
      else setMsg(`We couldn't find a place called “${v}”.`);
    } catch {
      setMsg("The place search didn't work just now. Try again.");
    }
    setBusy(false);
  };

  const clear = () => { setQ(""); setOrigin(null); setMsg(null); };
  const pill = "rounded-full border px-3 py-1 text-sm";

  return (
    <div>
      <form onSubmit={search} role="search" className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); if (origin?.label !== "your location") setOrigin(null); }}
          placeholder="Search by city, country or event"
          aria-label="Search events by city, country or event name"
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-paper-raised px-5 py-3 text-base text-ink placeholder:text-ink-faint focus:border-matcha focus:outline-2 focus:outline-matcha sm:min-w-[18rem]"
        />
        <button type="submit" disabled={busy} className="rounded-full bg-matcha px-6 py-3 text-sm font-medium text-paper hover:bg-forest disabled:opacity-60">Search</button>
        <button type="button" onClick={near} disabled={busy} className="rounded-full border border-matcha px-6 py-3 text-sm font-medium text-matcha hover:bg-matcha-soft disabled:opacity-60">Near me</button>
        {(origin || q) && <button type="button" onClick={clear} className="px-3 py-3 text-sm text-ink-muted underline hover:text-ink">Clear</button>}
      </form>
      {msg && <p className="mt-3 text-sm text-red-700" role="alert">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Event type">
        {KINDS.map((k) => (
          <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)} className={`${pill} ${kind === k.key ? "border-matcha bg-matcha-soft text-ink" : "border-line-strong text-ink-muted hover:bg-matcha-soft"}`}>
            {k.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-ink-muted" aria-live="polite">
        {rows.length} upcoming {rows.length === 1 ? "event" : "events"}
        {origin ? `, nearest first to ${origin.label}` : ""}.
        {q.trim() && !origin && rows.length === events.filter((e) => kind === "all" || e.kind === kind).length ? ` Nothing matches “${q.trim()}” by name. Press Search to sort by distance from that place.` : ""}
      </p>

      {groups.length > 0 && (
        <nav aria-label="Jump to a continent" className="mt-5 flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g.c} href={`#${slug(g.c)}`} className={`${pill} border-line-strong text-ink-muted hover:bg-matcha-soft`}>
              {g.c} <span className="tabular-nums text-ink-faint">({g.list.length})</span>
            </a>
          ))}
        </nav>
      )}

      <div className="mt-6 flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.c} id={slug(g.c)} aria-labelledby={`${slug(g.c)}-h`} className="scroll-mt-6 rounded-sm border border-line border-t-4 border-t-matcha bg-paper-raised p-4 sm:p-5">
            <h2 id={`${slug(g.c)}-h`} className="font-display text-2xl font-semibold text-ink">
              {g.c} <span className="text-base font-normal text-ink-faint">· {g.list.length} {g.list.length === 1 ? "event" : "events"}</span>
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {g.list.map(({ e, d }) => (
                <li key={e.id} className="flex gap-4 rounded-sm border border-line bg-paper p-4 sm:p-5">
                  <div className="w-16 shrink-0 text-center" aria-hidden="true">
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-forest">{fmtDate(e.start, { month: "short" })}</p>
                    <p className="font-display text-3xl font-semibold leading-none text-ink">{fmtDate(e.start, { day: "numeric" })}</p>
                    <p className="mt-1 text-xs text-ink-faint">{fmtDate(e.start, { year: "numeric" })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                      <span className="rounded-full border border-line-strong px-2 py-0.5 capitalize text-ink-muted">{e.kind}</span>
                      <span>
                        {fmtDate(e.start, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        {e.end ? ` to ${fmtDate(e.end, { month: "short", day: "numeric", year: "numeric" })}` : ""}
                      </span>
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-ink"><a href={`/events/${e.id}`} className="hover:text-matcha">{e.name}</a></h3>
                    <p className="text-sm text-ink-muted">
                      {[e.venue, e.city, e.country].filter(Boolean).join(", ")}
                      {d != null && <span className="ml-2 tabular-nums text-ink-faint">· {Math.round(d).toLocaleString("en-US")} km away</span>}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{e.blurb}</p>
                    {e.note && <p className="mt-1 text-xs text-ink-faint">{e.note}</p>}
                    <p className="mt-2 text-xs text-ink-faint">{CONFIDENCE_LABEL[e.confidence]}. Source: {e.source}.</p>
                    <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm"><a href={`/events/${e.id}`} className="text-matcha underline hover:text-forest">Details and photos</a><a href={e.url} target="_blank" rel="noopener noreferrer" className="text-matcha underline hover:text-forest">Organizer's page</a></span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {CONTINENTS.some((c) => !groups.some((g) => g.c === c)) && (
        <p className="mt-6 rounded-sm border border-dashed border-line-strong px-4 py-3 text-sm text-ink-muted">
          Nothing listed yet in {CONTINENTS.filter((c) => !groups.some((g) => g.c === c)).join(", ")}. Know of an event there? Send it to us below.
        </p>
      )}

      <p className="mt-8 max-w-2xl text-sm text-ink-muted">
        Running or know of a matcha event? <a href="#post" className="text-matcha underline hover:text-forest">Post it here</a> with the date, place and the organizer&apos;s page. We only list events we can check against the organizer. Prefer email? <a href={`mailto:${contactEmail}?subject=Matcha%20event%20for%20MatchaDB`} className="text-matcha underline hover:text-forest">Write to us</a>.
      </p>
    </div>
  );
}
