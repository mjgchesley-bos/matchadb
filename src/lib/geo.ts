// Small location helpers shared by the café finder.

export type Origin = { lat: number; lng: number; label: string };

export const USA_BOUNDS: [[number, number], [number, number]] = [
  [-125, 24.5],
  [-66.5, 49.5],
];

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// A typed ZIP or city is sent to Mapbox's geocoder to turn it into a point.
export async function geocode(query: string): Promise<Origin | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const isZip = /^\d{5}$/.test(query.trim());
  const types = isZip ? "postcode" : "postcode,place,locality,neighborhood,address";
  const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=us&types=${types}&limit=1`);
  if (!res.ok) throw new Error("geocoder");
  const json = (await res.json()) as { features?: { center: [number, number]; place_name: string }[] };
  const f = json.features?.[0];
  return f ? { lat: f.center[1], lng: f.center[0], label: f.place_name.replace(/, United States$/, "") } : null;
}
