"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { KIND_LABEL, type Store } from "@/lib/store-types";

// Search by ZIP code or city, or use your device's location, to find stores near
// you that carry brands from the database. Your position is only used in your
// browser to sort and map the list; nothing about it is sent to or stored by us.
// (A typed ZIP or city is sent to Mapbox's geocoder to turn it into a point.)

type Origin = { lat: number; lng: number; label: string };
type Listed = { store: Store; miles: number | null };

const USA_BOUNDS: [[number, number], [number, number]] = [
  [-125, 24.5],
  [-66.5, 49.5],
];
const RADII = [10, 25, 50, 100, 0]; // 0 = any distance

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function geocode(query: string): Promise<Origin | null> {
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

const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const directionsUrl = (s: Store) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.address}, ${s.city}, ${s.state} ${s.zip}`)}`;

export function StoreFinder({ stores, contactEmail, initialBrand = "" }: { stores: Store[]; contactEmail: string; initialBrand?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [brand, setBrand] = useState(initialBrand);
  const [radius, setRadius] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"search" | "locate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const brandOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stores) for (const b of s.brands) m.set(b.name, (m.get(b.name) ?? 0) + 1);
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [stores]);

  const { listed, nearest, totalForBrand } = useMemo(() => {
    const matching: Listed[] = stores
      .filter((s) => !brand || s.brands.some((b) => b.name === brand))
      .map((store) => ({ store, miles: origin ? haversineMiles(origin, store) : null }));
    if (!origin) {
      matching.sort((a, b) => a.store.state.localeCompare(b.store.state) || a.store.city.localeCompare(b.store.city) || a.store.name.localeCompare(b.store.name));
      return { listed: matching, nearest: null as Listed | null, totalForBrand: matching.length };
    }
    matching.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
    const within = radius > 0 ? matching.filter((x) => (x.miles ?? 0) <= radius) : matching;
    return { listed: within, nearest: matching[0] ?? null, totalForBrand: matching.length };
  }, [stores, brand, origin, radius]);

  // The features currently on the map, kept in a ref so a late style load can apply them.
  const currentFeatures = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });

  // ---- map ----
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/light-v11", bounds: USA_BOUNDS, fitBoundsOptions: { padding: 20 } });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    map.on("style.load", () => {
      map.addSource("stores", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 38,
        clusterMaxZoom: 11,
      });
      map.addLayer({
        id: "store-cluster",
        type: "circle",
        source: "stores",
        filter: ["has", "point_count"],
        paint: { "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 15, 24], "circle-color": "#f6f1e4", "circle-stroke-color": "#3c7a2a", "circle-stroke-width": 3 },
      });
      map.addLayer({
        id: "store-cluster-count",
        type: "symbol",
        source: "stores",
        filter: ["has", "point_count"],
        layout: { "text-field": ["to-string", ["get", "point_count"]], "text-size": 12, "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-allow-overlap": true },
        paint: { "text-color": "#222818" },
      });
      map.addLayer({
        id: "store-point",
        type: "circle",
        source: "stores",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["case", ["==", ["get", "sel"], 1], 11, 8],
          "circle-color": ["case", ["==", ["get", "sel"], 1], "#2b5a20", "#3c7a2a"],
          "circle-stroke-color": "#fff6df",
          "circle-stroke-width": 2.5,
        },
      });
      // Re-apply whatever the page currently shows (the style can finish loading after the first render).
      const src = map.getSource("stores") as mapboxgl.GeoJSONSource;
      src.setData(currentFeatures.current);
    });

    map.on("click", (e) => {
      const feats = map.queryRenderedFeatures(e.point, { layers: ["store-cluster", "store-point"] });
      const f = feats[0];
      if (!f) return;
      if (f.properties?.cluster) {
        const src = map.getSource("stores") as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(f.properties.cluster_id as number, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.3 });
        });
        return;
      }
      if (f.properties?.id) setSelectedId(f.properties.id as string);
    });
    for (const id of ["store-cluster", "store-point"]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    currentFeatures.current = {
      type: "FeatureCollection",
      features: listed.map(({ store }) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [store.lng, store.lat] },
        properties: { id: store.id, sel: store.id === selectedId ? 1 : 0 },
      })),
    };
    const src = mapRef.current?.getSource("stores") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(currentFeatures.current);
  }, [listed, selectedId]);

  // Frame the map: everything when there is no search, the area around you after one.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!origin) {
      map.fitBounds(USA_BOUNDS, { padding: 20, duration: 800 });
      return;
    }
    const el = document.createElement("div");
    el.style.cssText = "width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.35);";
    el.setAttribute("aria-label", "Your search location");
    userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([origin.lng, origin.lat]).addTo(map);
    const near = listed.slice(0, 5);
    if (near.length === 0) {
      map.flyTo({ center: [origin.lng, origin.lat], zoom: 8, duration: 900 });
      return;
    }
    const b = new mapboxgl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
    for (const { store } of near) b.extend([store.lng, store.lat]);
    map.fitBounds(b, { padding: 70, maxZoom: 12, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, brand, radius]);

  function select(id: string) {
    setSelectedId(id);
    const s = stores.find((x) => x.id === id);
    if (s) mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 800 });
  }

  // Selecting a pin on the map scrolls its card into view.
  useEffect(() => {
    if (selectedId) cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy("search");
    setMessage(null);
    try {
      const o = await geocode(q);
      if (!o) setMessage("We couldn't find that place. Try a 5-digit ZIP code, or a city and state.");
      else {
        setOrigin(o);
        setSelectedId(null);
      }
    } catch {
      setMessage("Search isn't available right now. Please try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Your browser can't share its location. Search by ZIP code or city instead.");
      return;
    }
    setBusy("locate");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" });
        setQuery("");
        setSelectedId(null);
        setBusy(null);
      },
      (err) => {
        setBusy(null);
        setMessage(err.code === 1 ? "Location access was blocked. Search by ZIP code or city instead." : "We couldn't get your location. Search by ZIP code or city instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function clearSearch() {
    setOrigin(null);
    setQuery("");
    setMessage(null);
    setSelectedId(null);
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const fieldClass = "border border-line-strong rounded-sm px-3 py-2.5 bg-paper text-sm text-ink focus:outline-none focus:border-matcha";

  return (
    <div>
      <form onSubmit={runSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="store-q" className="block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5">
            ZIP code or city
          </label>
          <div className="flex gap-2">
            <input id="store-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. 02140 or Brooklyn, NY" autoComplete="postal-code" className={`${fieldClass} flex-1 min-w-0`} />
            <button type="submit" disabled={busy !== null || !query.trim()} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper hover:bg-forest transition-colors disabled:opacity-50">
              {busy === "search" ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
        <button type="button" onClick={useMyLocation} disabled={busy !== null} className="rounded-sm border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-matcha transition-colors disabled:opacity-50">
          {busy === "locate" ? "Locating…" : "Use my location"}
        </button>
        <div>
          <label htmlFor="store-brand" className="block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5">
            Brand
          </label>
          <select id="store-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={`${fieldClass} w-full lg:w-56`}>
            <option value="">Any brand</option>
            {brandOptions.map(([name, n]) => (
              <option key={name} value={name}>
                {name} ({n})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="store-radius" className="block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5">
            Within
          </label>
          <select id="store-radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} disabled={!origin} className={`${fieldClass} w-full lg:w-32 disabled:opacity-50`}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? "Any distance" : `${r} miles`}
              </option>
            ))}
          </select>
        </div>
      </form>
      <p className="mt-2 text-xs text-ink-faint">Your location is used only in your browser to sort this list. We don&apos;t send it anywhere or store it.</p>
      {message && (
        <p className="mt-3 rounded-sm border border-line bg-paper-raised px-3 py-2 text-sm text-ink-muted" role="status">
          {message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-5">
        <div className="relative h-[360px] lg:h-[640px] rounded-sm overflow-hidden border border-line">
          {token ? (
            <div ref={containerRef} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-muted">Map token not configured.</div>
          )}
        </div>

        <section aria-label="Stores" className="lg:h-[640px] lg:overflow-y-auto">
          <p className="text-sm text-ink-muted mb-3" aria-live="polite">
            {origin
              ? `${listed.length} store${listed.length === 1 ? "" : "s"}${radius > 0 ? ` within ${radius} miles of` : " near"} ${origin.label}`
              : `${listed.length} store${listed.length === 1 ? "" : "s"} listed${brand ? ` for ${brand}` : ""}. Search a ZIP code or use your location to sort by distance.`}
            {origin && (
              <button type="button" onClick={clearSearch} className="ml-2 text-matcha hover:text-forest underline">
                Clear
              </button>
            )}
          </p>

          {origin && listed.length === 0 && (
            <div className="rounded-sm border border-line bg-paper-raised p-4 text-sm text-ink-muted">
              <p>
                No {brand ? `${brand} ` : ""}stores within {radius} miles yet.
              </p>
              {nearest && (
                <p className="mt-2">
                  The nearest we have is <strong className="text-ink">{nearest.store.name}</strong> in {nearest.store.city}, {nearest.store.state}, about {Math.round(nearest.miles ?? 0).toLocaleString()} miles away.{" "}
                  <button type="button" onClick={() => setRadius(0)} className="text-matcha hover:text-forest underline">
                    Show all distances
                  </button>
                </p>
              )}
              <p className="mt-2">Know a store near you that carries these brands? Tell us below.</p>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {listed.map(({ store: s, miles }) => (
              <li
                key={s.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(s.id, el);
                  else cardRefs.current.delete(s.id);
                }}
                className={`rounded-sm border bg-paper-raised p-4 transition-colors ${selectedId === s.id ? "border-matcha bg-matcha-soft" : "border-line"}`}
              >
                <button type="button" onClick={() => select(s.id)} className="block w-full text-left">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-semibold text-ink">{s.name}</span>
                    {miles != null && <span className="text-xs tabular-nums text-matcha whitespace-nowrap">{miles < 10 ? miles.toFixed(1) : Math.round(miles).toLocaleString()} mi</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    {s.address}, {s.city}, {s.state} {s.zip}
                  </span>
                </button>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">{KIND_LABEL[s.kind]}</span>
                  {s.brands.map((b) => (
                    <Link key={b.name} href={`/brands/${encodeURIComponent(b.name)}`} className="rounded-full border border-line-strong px-2 py-0.5 text-ink-muted hover:border-matcha hover:text-matcha transition-colors">
                      Carries {b.name}
                    </Link>
                  ))}
                </p>
                {s.note && <p className="mt-2 text-xs text-ink-faint leading-relaxed">{s.note}</p>}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <a href={directionsUrl(s)} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                    Directions
                  </a>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                    Store website
                  </a>
                  <a href={s.brands[0]?.evidence ?? s.url} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-ink-muted">
                    Source, checked {fmtDate(s.checked)}
                  </a>
                </p>
              </li>
            ))}
          </ul>
          {!origin && totalForBrand === 0 && <p className="text-sm text-ink-muted">No stores listed for that brand yet.</p>}
        </section>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Know a store that carries these brands, or spot something out of date?{" "}
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent("MatchaDB store suggestion")}&body=${encodeURIComponent("Store name:\nAddress:\nWebsite:\nBrands carried (and a link showing it):\n")}`}
          className="text-matcha hover:text-forest underline"
        >
          Email us
        </a>
        .
      </p>
    </div>
  );
}
