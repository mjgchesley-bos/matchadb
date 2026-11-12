// Small location helpers shared by the café finder.

export type Origin = { lat: number; lng: number; label: string; country?: string; relevance?: number };

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const KM_PER_MILE = 1.609344;

// A typed ZIP, postcode or city is sent to Mapbox's geocoder to turn it into a point. `countries` limits the
// search (lower-case ISO codes).
type MapboxFeature = { relevance?: number; center: [number, number]; place_name: string; context?: { id: string; short_code?: string }[]; properties?: { short_code?: string } };
const toOrigin = (f: MapboxFeature): Origin => ({
  lat: f.center[1],
  lng: f.center[0],
  label: f.place_name.replace(/, United States$/, ""),
  country: f.context?.find((c) => c.id.startsWith("country"))?.short_code ?? f.properties?.short_code,
  relevance: f.relevance,
});

// Up to `limit` candidate places for what was typed (best first). `autocomplete` also matches a half-typed name.
export async function geocodeMany(query: string, countries: string[], language = "en", limit = 5, autocomplete = false): Promise<Origin[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return [];
  const q = query.trim();
  if (!q) return [];
  const types = "postcode,place,locality,neighborhood,address";
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=${countries.join(",")}&types=${types}&limit=${limit}&autocomplete=${autocomplete}&language=${encodeURIComponent(language)}`,
  );
  if (!res.ok) throw new Error("geocoder");
  const json = (await res.json()) as { features?: MapboxFeature[] };
  return (json.features ?? []).map(toOrigin);
}

export async function geocode(query: string, countries: string[], language = "en"): Promise<Origin | null> {
  return (await geocodeMany(query, countries, language, 1))[0] ?? null;
}
