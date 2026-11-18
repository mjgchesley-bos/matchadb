import { supabaseAnon } from "@/lib/supabase-server";
import type { Continent, MatchaEvent } from "@/lib/events";

// Community-posted events: approved rows only, through the public_events() function (supabase/event_submissions.sql). It returns no emails and
// no member ids. If the database part has not been set up yet, or anything fails, there are simply no community events.
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
export const eventMediaUrl = (path: string): string => `${BASE}/storage/v1/object/public/event-media/${path}`;

type Row = { id: string; name: string; start_date: string; end_date: string | null; city: string; country: string; continent: Continent; venue: string | null; lat: number; lng: number; organizer: string | null; url: string; description: string | null; images: string[] };

export async function getCommunityEvents(): Promise<MatchaEvent[]> {
  try {
    const { data, error } = await supabaseAnon().rpc("public_events");
    if (error || !data) return [];
    return (data as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      kind: "gathering",
      start: r.start_date,
      ...(r.end_date ? { end: r.end_date } : {}),
      city: r.city,
      country: r.country,
      continent: r.continent,
      ...(r.venue ? { venue: r.venue } : {}),
      lat: r.lat,
      lng: r.lng,
      blurb: r.description?.trim() || "Posted by the organizer or a member.",
      url: r.url,
      ...(r.organizer ? { organizer: r.organizer } : {}),
      images: (r.images ?? []).map(eventMediaUrl),
      source: "Posted to MatchaDB and reviewed",
      confidence: "submitted",
    }));
  } catch {
    return [];
  }
}

export async function getEventPhotos(eventId: string): Promise<{ src: string; caption: string | null; year: number | null; credit: string | null }[]> {
  try {
    const { data } = await supabaseAnon().rpc("public_event_photos", { p_event: eventId });
    return ((data ?? []) as { path: string; caption: string | null; year: number | null; credit: string | null }[]).map((p) => ({ src: eventMediaUrl(p.path), caption: p.caption, year: p.year, credit: p.credit }));
  } catch {
    return [];
  }
}
