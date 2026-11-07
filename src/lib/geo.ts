// Small location helpers shared by the café finder.

export type Origin = { lat: number; lng: number; label: string; country?: string };

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
export async function geocode(query: string, countries: string[]): Promise<Origin | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const q = query.trim();
  const types = "postcode,place,locality,neighborhood,address";
  const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=${countries.join(",")}&types=${types}&limit=1&language=en`);
  if (!res.ok) throw new Error("geocoder");
  const json = (await res.json()) as { features?: { center: [number, number]; place_name: string; context?: { id: string; short_code?: string }[]; properties?: { short_code?: string } }[] };
  const f = json.features?.[0];
  if (!f) return null;
  const country = f.context?.find((c) => c.id.startsWith("country"))?.short_code ?? f.properties?.short_code;
  return { lat: f.center[1], lng: f.center[0], label: f.place_name.replace(/, United States$/, ""), country };
}
