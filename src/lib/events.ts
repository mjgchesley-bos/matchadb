import auto from "../../data/events-auto.json";

// Matcha and tea events around the world. Every entry was checked against the organizer's own page or a listing that names the date; the
// `confidence` field says which. Recurring festivals with an expected date say so. Coordinates are the town or venue area, not a street address.
export type EventKind = "festival" | "tea festival" | "trade show" | "tasting" | "exhibition" | "gathering";
export type Confidence = "confirmed" | "reported" | "listed" | "expected" | "submitted";
export type Continent = "North America" | "South America" | "Europe" | "Asia" | "Oceania" | "Africa";

export type MatchaEvent = {
  id: string;
  name: string;
  kind: EventKind;
  start: string; // YYYY-MM-DD
  end?: string;
  city: string;
  country: string;
  continent: Continent;
  venue?: string;
  lat: number;
  lng: number;
  blurb: string;
  url: string;
  organizer?: string;
  // Public picture links (community posts); sourced pictures live in event-images.ts.
  images?: string[];
  source: string;
  confidence: Confidence;
  note?: string;
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: "Date confirmed on the organizer's own site",
  reported: "Date confirmed by the organizer to a public listing; check their site before you travel",
  listed: "Date from event listings; confirm with the organizer",
  expected: "Recurring: date expected from the usual schedule",
  submitted: "Posted by an organizer or member and reviewed by us; check the organizer's page",
};

export const EVENTS: MatchaEvent[] = [
  {
    id: "matchafest-miami-2026",
    name: "MatchaFest Miami",
    kind: "festival",
    start: "2026-12-12",
    city: "Miami, FL",
    country: "United States",
    continent: "North America",
    venue: "Wynwood Marketplace",
    lat: 25.8008,
    lng: -80.1994,
    blurb: "A one-day matcha festival with brand tastings, demos, creator shows and limited drops.",
    url: "https://matchafest.com/",
    source: "MatchaFest",
    confidence: "confirmed",
  },
  {
    id: "uji-record-2026",
    name: "Largest Japanese tea-brewing record attempt (teapot)",
    kind: "gathering",
    start: "2026-11-29",
    city: "Ujitawara, Kyoto",
    country: "Japan",
    continent: "Asia",
    venue: "Nishinoyama Observation Plaza",
    lat: 34.8553,
    lng: 135.8478,
    blurb: "A community attempt to set a Japanese record for the most people brewing Japanese tea with a teapot, in Kyoto's tea country. Applications were open when we checked.",
    url: "https://ujicha.or.jp/en/event/",
    source: "Kyoto Prefecture Tea Industry Chamber",
    confidence: "confirmed",
    note: "Japanese tea in general rather than matcha.",
  },
  {
    id: "uji-utensils-2026",
    name: "Uji Tea Festival utensil exhibition",
    kind: "exhibition",
    start: "2026-10-16",
    end: "2026-11-30",
    city: "Uji, Kyoto",
    country: "Japan",
    continent: "Asia",
    lat: 34.8845,
    lng: 135.7997,
    blurb: "An exhibition of tea utensils held around the Uji Tea Festival, in the town that is the home of matcha.",
    url: "https://ujicha.or.jp/en/event/",
    source: "Kyoto Prefecture Tea Industry Chamber",
    confidence: "confirmed",
  },
  {
    id: "amsterdam-tea-2027",
    name: "Amsterdam Tea Festival",
    kind: "festival",
    start: "2027-01-30",
    city: "Amsterdam",
    country: "Netherlands",
    continent: "Europe",
    venue: "Kromhouthal, Gedempt Hamerkanaal 231",
    lat: 52.3894,
    lng: 4.9014,
    blurb: "A one-day festival of tea, ceramics, food and craft, 10:00 to 19:00. Exhibitors include sellers of Japanese teas and matcha.",
    url: "https://amsterdamteafestival.com/",
    source: "Amsterdam Tea Festival",
    confidence: "confirmed",
  },
  {
    id: "world-tea-expo-2027",
    name: "World Tea Expo",
    kind: "trade show",
    start: "2027-03-22",
    end: "2027-03-24",
    city: "Las Vegas, NV",
    country: "United States",
    continent: "North America",
    venue: "Las Vegas Convention Center",
    lat: 36.1318,
    lng: -115.1533,
    blurb: "The tea industry's big trade show and conference: suppliers, retailers and buyers, with matcha producers among the exhibitors. For the trade.",
    url: "https://www.worldteaexpo.com/",
    source: "Trade-show listings (the organizer's site blocks automated reading)",
    confidence: "listed",
  },
  {
    id: "sf-tea-2027",
    name: "SF International Tea Festival (spring)",
    kind: "festival",
    start: "2027-05-08",
    end: "2027-05-09",
    city: "San Francisco, CA",
    country: "United States",
    continent: "North America",
    venue: "Ferry Building Marketplace",
    lat: 37.7956,
    lng: -122.3935,
    blurb: "A full day of tastings from around 30 international tea vendors, plus classes.",
    url: "https://www.eventbrite.com/e/spring-sf-international-tea-festival-2027-tickets-2004746261033",
    source: "Organizer's Eventbrite listing",
    confidence: "listed",
    note: "The listing says full details arrive in 2027; the organizer's posts mention May 8 to 9.",
  },
  {
    id: "uji-tea-festival-2027",
    name: "Uji Tea Festival (Ujicha Matsuri)",
    kind: "festival",
    start: "2027-10-03",
    city: "Uji, Kyoto",
    country: "Japan",
    continent: "Asia",
    venue: "Around Uji Bridge",
    lat: 34.8894,
    lng: 135.8081,
    blurb: "The traditional festival of Uji tea, held around Uji Bridge, with a tea ceremony dedicated to the founders of Uji tea.",
    url: "https://ujicha.or.jp/en/event/",
    source: "Kyoto Prefecture Tea Industry Chamber",
    confidence: "expected",
    note: "Held every year on the first Sunday of October; that is October 3 in 2027.",
  },
  {
    id: "hktdc-tea-fair-2027",
    name: "HKTDC Hong Kong International Tea Fair",
    kind: "trade show",
    start: "2027-08-12",
    end: "2027-08-14",
    city: "Hong Kong",
    country: "Hong Kong",
    continent: "Asia",
    venue: "Hong Kong Convention and Exhibition Centre",
    lat: 22.2831,
    lng: 114.1737,
    blurb: "Asia's trade fair for tea: producers and buyers from many countries, with Japanese tea and matcha among the exhibitors. The physical fair runs Thursday to Saturday.",
    url: "https://www.hktdc.com/event/hkteafair/en/fair-at-a-glance",
    source: "HKTDC (the organizer)",
    confidence: "confirmed",
  },
  {
    id: "tea-world-festival-seoul-2027",
    name: "Tea World Festival Seoul",
    kind: "tea festival",
    start: "2027-05-05",
    end: "2027-05-08",
    city: "Seoul",
    country: "South Korea",
    continent: "Asia",
    venue: "COEX, Hall C",
    lat: 37.5126,
    lng: 127.0590,
    blurb: "A large annual tea expo in Seoul, in its 24th edition, with Korean and international tea sellers.",
    url: "https://www.cantonfair.net/event/6544-tea-world-festival",
    source: "Event listing that cites the organizer's site",
    confidence: "listed",
  },
];

// The curated list above plus data/events-auto.json, which a scheduled job rebuilds every few days (scripts/refresh_events.py). A curated entry
// wins over an automatic one for the same event (same city and start date, or the same name).
type AutoEvent = Omit<MatchaEvent, "blurb"> & { checked?: string };
const norm = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(the|festival|tea|expo|international)\b/g, "").trim();

// Every event we know about (curated, automatic and community-posted), including ones that have passed.
export const allEvents = (extra: MatchaEvent[] = []): MatchaEvent[] => {
  const merged: MatchaEvent[] = [...EVENTS, ...extra];
  for (const a of auto as AutoEvent[]) {
    const dup = merged.some((e) => (e.city.split(",")[0] === a.city && e.start === a.start) || norm(e.name) === norm(a.name));
    if (dup) continue;
    merged.push({ ...a, blurb: `A ${a.kind === "trade show" ? "trade show" : "tea festival"} in ${a.city}. Matcha is usually among the teas on offer; check the organizer's lineup.` });
  }
  return merged;
};
export const upcoming = (today: string, extra: MatchaEvent[] = []): MatchaEvent[] => allEvents(extra).filter((e) => (e.end ?? e.start) >= today).sort((a, b) => (a.start < b.start ? -1 : 1));
export const eventById = (id: string, extra: MatchaEvent[] = []): MatchaEvent | undefined => allEvents(extra).find((e) => e.id === id);
