import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { CultivarMap } from "@/components/CultivarMap";
import { EventPhotoForm } from "@/components/EventPhotoForm";
import { JsonLd } from "@/components/JsonLd";
import { CONFIDENCE_LABEL, eventById, upcoming } from "@/lib/events";
import { EVENT_PICTURES } from "@/lib/event-images";
import { getCommunityEvents, getEventPhotos } from "@/lib/events-community";
import { isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";

// Built the first time someone asks for it, then kept for an hour.
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { lang: string; id: string };
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
const label = "font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3";
const panel = "rounded-sm border border-line bg-paper-raised px-5 py-5";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang: raw, id } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const e = eventById(id, await getCommunityEvents());
  if (!e) return { title: "Event not found", robots: { index: false } };
  const when = e.end ? `${fmt(e.start, { month: "short", day: "numeric" })} to ${fmt(e.end, { month: "short", day: "numeric", year: "numeric" })}` : fmt(e.start, { month: "long", day: "numeric", year: "numeric" });
  const title = `${e.name}: ${when}, ${e.city}`;
  const description = `${e.name} in ${e.city}, ${e.country}, ${when}. Details, the organizer's link, pictures and how to add yours.`;
  const alternates = pageAlternates(lang, `/events/${e.id}`);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { lang: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const community = await getCommunityEvents();
  const e = eventById(id, community);
  if (!e) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const passed = (e.end ?? e.start) < today;
  const photos = await getEventPhotos(e.id);
  const sourced = EVENT_PICTURES[e.id] ?? [];
  const posted = (e.images ?? []).map((src) => ({ src, caption: null as string | null, year: null as number | null, credit: null as string | null }));
  const url = pageAlternates(lang, `/events/${e.id}`).canonical;
  const more = upcoming(today, community).filter((x) => x.id !== e.id && x.continent === e.continent).slice(0, 3);
  const when = e.end ? `${fmt(e.start, { weekday: "short", month: "long", day: "numeric" })} to ${fmt(e.end, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}` : fmt(e.start, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.name,
          startDate: e.start,
          ...(e.end ? { endDate: e.end } : {}),
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: e.venue ?? e.city, address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: e.country } },
          description: e.blurb,
          url: e.url,
          ...(e.organizer ? { organizer: { "@type": "Organization", name: e.organizer } } : {}),
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-faint">
        <Link href="/events" className="hover:text-ink">Events</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-muted">{e.continent}</span>
      </nav>

      <header className="max-w-3xl">
        <p className={label}>{e.kind}{passed ? " · has passed" : ""}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight text-ink text-balance">{e.name}</h1>
        <p className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-line-strong bg-paper-raised px-3 py-1 text-ink-muted">{when}</span>
          <span className="rounded-full border border-line-strong bg-paper-raised px-3 py-1 text-ink-muted">{[e.city, e.country].join(", ")}</span>
        </p>
      </header>

      {passed && <p className="mt-6 max-w-3xl rounded-sm border border-line bg-matcha-soft px-5 py-3 text-sm text-ink-muted">This date has passed. Check the organizer&apos;s page for the next one.</p>}

      <section className={`mt-8 max-w-3xl ${panel}`} aria-labelledby="ev-about">
        <h2 id="ev-about" className={label}>About</h2>
        <p className="leading-relaxed text-ink-muted">{e.blurb}</p>
        {e.note && <p className="mt-3 text-sm text-ink-faint">{e.note}</p>}
      </section>

      <section className={`mt-8 max-w-3xl ${panel}`} aria-labelledby="ev-facts">
        <h2 id="ev-facts" className={label}>Details</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
          <div className="contents"><dt className="text-ink-faint">When</dt><dd className="text-ink">{when}</dd></div>
          <div className="contents"><dt className="text-ink-faint">Where</dt><dd className="text-ink">{[e.venue, e.city, e.country].filter(Boolean).join(", ")}</dd></div>
          {e.organizer && <div className="contents"><dt className="text-ink-faint">Organizer</dt><dd className="text-ink">{e.organizer}</dd></div>}
          <div className="contents"><dt className="text-ink-faint">How we know</dt><dd className="text-ink">{CONFIDENCE_LABEL[e.confidence]}. Source: {e.source}.</dd></div>
        </dl>
        <a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest">Go to the event page</a>
      </section>

      <section className={`mt-8 max-w-3xl ${panel}`} aria-labelledby="ev-map">
        <h2 id="ev-map" className={label}>Where it is</h2>
        <p className="mb-3 text-sm text-ink-muted">{[e.venue, e.city, e.country].filter(Boolean).join(", ")}. The pin marks the town or venue area, not a street address.</p>
        <CultivarMap pins={[{ name: e.city, sub: e.country, lat: e.lat, lng: e.lng, count: 1, href: null }]} label={`Map showing ${e.city}`} one="Event location" many="Event location" openLabel="" />
      </section>

      <section className={`mt-8 ${panel}`} aria-labelledby="ev-photos">
        <h2 id="ev-photos" className={label}>Photos and flyers</h2>
        {sourced.length + posted.length + photos.length === 0 ? (
          <p className="text-sm text-ink-muted">No pictures yet. If you took photos at a past edition, or you run this event and have a flyer, add them below.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sourced.map((p) => (
              <figure key={p.src} className="overflow-hidden rounded-sm border border-line bg-paper">
                <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(min-width: 1024px) 30vw, 100vw" className="h-48 w-full object-cover" />
                <figcaption className="px-3 py-2 text-xs leading-relaxed text-ink-faint">{p.caption}. <a href={p.page} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">{p.credit}</a></figcaption>
              </figure>
            ))}
            {[...posted, ...photos].map((p) => (
              <figure key={p.src} className="overflow-hidden rounded-sm border border-line bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element -- member or organizer picture from storage */}
                <img src={p.src} alt={p.caption ?? `Picture from ${e.name}`} loading="lazy" className="h-48 w-full object-cover" />
                <figcaption className="px-3 py-2 text-xs leading-relaxed text-ink-faint">
                  {[p.caption, p.year ? String(p.year) : null, p.credit ? `Photo: ${p.credit}` : null].filter(Boolean).join(" · ") || "Shared with MatchaDB"}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className={`mt-8 max-w-3xl ${panel}`} aria-labelledby="ev-add">
        <h2 id="ev-add" className={label}>Add your photos or flyer</h2>
        <p className="mb-3 text-sm text-ink-muted">Pictures from any year are welcome. We review each one before it shows, and you keep the rights to your work.</p>
        <EventPhotoForm eventId={e.id} />
      </section>

      {more.length > 0 && (
        <section className="mt-10" aria-labelledby="ev-more">
          <h2 id="ev-more" className={label}>More in {e.continent}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {more.map((m) => (
              <Link key={m.id} href={`/events/${m.id}`} className="rounded-sm border border-line bg-paper-raised p-4 hover:border-matcha hover:bg-matcha-soft">
                <span className="block font-display text-lg font-semibold text-ink">{m.name}</span>
                <span className="mt-1 block text-xs text-ink-faint">{fmt(m.start, { month: "short", day: "numeric", year: "numeric" })} · {m.city}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="sr-only">{url}</p>
    </main>
  );
}
