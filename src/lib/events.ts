// Matcha and tea events around the world. Every entry was checked against the organizer's own page or a listing that names the date; the
// `confidence` field says which. Recurring festivals with an expected date say so. Coordinates are the town or venue area, not a street address.
export type EventKind = "festival" | "trade show" | "tasting" | "exhibition" | "gathering";
export type Confidence = "confirmed" | "listed" | "expected";

export type MatchaEvent = {
  id: string;
  name: string;
  kind: EventKind;
  start: string; // YYYY-MM-DD
  end?: string;
  city: string;
  country: string;
  venue?: string;
  lat: number;
  lng: number;
  blurb: string;
  url: string;
  source: string;
  confidence: Confidence;
  note?: string;
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: "Confirmed on the organizer's site",
  listed: "Date from event listings; confirm with the organizer",
  expected: "Recurring: date expected from the usual schedule",
};

export const EVENTS: MatchaEvent[] = [
  {
    id: "matchafest-miami-2026",
    name: "MatchaFest Miami",
    kind: "festival",
    start: "2026-12-12",
    city: "Miami, FL",
    country: "United States",
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
    venue: "Around Uji Bridge",
    lat: 34.8894,
    lng: 135.8081,
    blurb: "The traditional festival of Uji tea, held around Uji Bridge, with a tea ceremony dedicated to the founders of Uji tea.",
    url: "https://ujicha.or.jp/en/event/",
    source: "Kyoto Prefecture Tea Industry Chamber",
    confidence: "expected",
    note: "Held every year on the first Sunday of October; that is October 3 in 2027.",
  },
];

export const upcoming = (today: string): MatchaEvent[] => EVENTS.filter((e) => (e.end ?? e.start) >= today).sort((a, b) => (a.start < b.start ? -1 : 1));
