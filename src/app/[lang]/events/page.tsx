import type { Metadata } from "next";
import { EventsExplorer } from "@/components/EventsExplorer";
import { JsonLd } from "@/components/JsonLd";
import { upcoming } from "@/lib/events";
import { getCommunityEvents } from "@/lib/events-community";
import { EventSubmitForm } from "@/components/EventSubmitForm";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { langOf } from "@/i18n/params";
import { pageAlternates } from "@/i18n/seo";

// Rebuilt every ten minutes, so newly approved posts show quickly and finished events drop off.
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const title = "Matcha Events: Festivals, Tastings and Tea Shows Near You";
  const description = "Upcoming matcha and tea festivals, tastings, trade shows and gatherings around the world, with a search by city and a Near me button.";
  const alternates = pageAlternates(lang, "/events");
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } };
}

export default async function EventsPage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  const events = upcoming(new Date().toISOString().slice(0, 10), await getCommunityEvents());
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": events.map((e) => ({
            "@type": "Event",
            name: e.name,
            startDate: e.start,
            ...(e.end ? { endDate: e.end } : {}),
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            location: { "@type": "Place", name: e.venue ?? e.city, address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: e.country } },
            description: e.blurb,
            url: e.url,
          })),
        }}
      />
      <header className="rounded-md border-2 border-matcha bg-gradient-to-br from-matcha-soft to-paper-raised p-5 shadow-sm sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">Events</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">Matcha events around the world</h1>
        <p className="mt-4 text-ink-muted leading-relaxed">
          Matcha festivals, tea festivals, trade shows and gatherings, grouped by continent. Search by city or country, or tap Near me to see what is closest. Every listing links to the organizer and says how we know the date. The list is rechecked every few days and events drop off once they have passed; <a href={`${SITE_URL}/contact`} className="text-matcha underline hover:text-forest">tell us about one we are missing</a>.
        </p>
      </header>
      <details id="post" className="group mt-8 rounded-sm border border-line border-t-4 border-t-matcha bg-paper-raised p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block font-display text-xl font-semibold text-ink">Post an event</span>
            <span className="block text-sm text-ink-muted">Running or know of a matcha event? Send the link, the details and any flyer or photos, including from past years.</span>
          </span>
          <span className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper group-open:hidden">Post an event</span>
        </summary>
        <div className="mt-5 border-t border-line pt-5">
          <EventSubmitForm />
        </div>
      </details>
      <div className="mt-8 rounded-sm border border-line bg-paper-raised p-5 sm:p-6">
        <EventsExplorer events={events} contactEmail={CONTACT_EMAIL} />
      </div>
    </main>
  );
}
