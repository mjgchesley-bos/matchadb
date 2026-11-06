"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cafeSlug, directionsUrl, type CafeSlim } from "@/lib/cafe-types";
import { USA_BOUNDS, geocode, haversineMiles, type Origin } from "@/lib/geo";

// Find cafés near you whose own website lists matcha. Search by ZIP or city, or use your
// device's location. Your position is only used in your browser to sort and map the list;
// nothing about it is sent to or stored by us. (A typed ZIP or city is sent to Mapbox's
// geocoder to turn it into a point.)

type Cafe = { id: string; name: string; address: string; city: string; state: string; zip: string; lat: number; lng: number; focus: boolean };
type Listed = { cafe: Cafe; miles: number | null };

const RADII = [5, 10, 25, 50, 0]; // 0 = any distance
const LIST_CAP = 30;

const fromSlim = (r: CafeSlim): Cafe => ({ id: r[0], name: r[1], address: r[2], city: r[3], state: r[4], zip: r[5], lat: r[6], lng: r[7], focus: r[8] === 1 });
const place = (c: Cafe) => [c.address, c.city, `${c.state} ${c.zip}`.trim()].filter(Boolean).join(", ");

// The popup over a pin. Built with DOM nodes and textContent so a café name can never inject markup.
function buildPopup(c: Cafe): HTMLElement {
  const el = (tag: string, cls: string, text?: string) => {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const root = el("div", "store-pop");
  root.appendChild(el("p", "font-display text-base font-semibold text-ink leading-snug", c.name));
  root.appendChild(el("p", "mt-0.5 text-xs text-ink-muted", place(c)));
  const a = el("a", "mt-2 inline-block text-sm font-medium text-matcha-ink underline underline-offset-2", "Menu, ratings and photos") as HTMLAnchorElement;
  a.href = `/cafes/${cafeSlug(c)}`;
  root.appendChild(a);
  return root;
}

export function CafeFinder({ contactEmail }: { contactEmail: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const [all, setAll] = useState<Cafe[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radius, setRadius] = useState(10);
  const [focusOnly, setFocusOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"search" | "locate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/data/cafes-slim.json")
      .then((r) => (r.ok ? (r.json() as Promise<CafeSlim[]>) : Promise.reject(new Error("load"))))
      .then((rows) => live && setAll(rows.map(fromSlim)))
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, []);

  const { listed, nearest, total } = useMemo(() => {
    const q = name.trim().toLowerCase();
    const matching: Listed[] = (all ?? [])
      .filter((c) => (!focusOnly || c.focus) && (!q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)))
      .map((cafe) => ({ cafe, miles: origin ? haversineMiles(origin, cafe) : null }));
    if (!origin) {
      matching.sort((a, b) => a.cafe.state.localeCompare(b.cafe.state) || a.cafe.city.localeCompare(b.cafe.city) || a.cafe.name.localeCompare(b.cafe.name));
      return { listed: matching, nearest: null as Listed | null, total: matching.length };
    }
    matching.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
    const within = radius > 0 ? matching.filter((x) => (x.miles ?? 0) <= radius) : matching;
    return { listed: within, nearest: matching[0] ?? null, total: matching.length };
  }, [all, name, focusOnly, origin, radius]);

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
      map.addSource("cafes", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 40, clusterMaxZoom: 12 });
      map.addLayer({
        id: "cafe-cluster",
        type: "circle",
        source: "cafes",
        filter: ["has", "point_count"],
        paint: { "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 24, 200, 28], "circle-color": "#f6f1e4", "circle-stroke-color": "#3c7a2a", "circle-stroke-width": 3 },
      });
      map.addLayer({
        id: "cafe-cluster-count",
        type: "symbol",
        source: "cafes",
        filter: ["has", "point_count"],
        layout: { "text-field": ["to-string", ["get", "point_count"]], "text-size": 12, "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-allow-overlap": true },
        paint: { "text-color": "#222818" },
      });
      map.addLayer({
        id: "cafe-point",
        type: "circle",
        source: "cafes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["case", ["==", ["get", "sel"], 1], 11, 8],
          "circle-color": ["case", ["==", ["get", "sel"], 1], "#2b5a20", ["==", ["get", "focus"], 1], "#1f6b3a", "#6aa84f"],
          "circle-stroke-color": "#fff6df",
          "circle-stroke-width": 2.5,
        },
      });
      (map.getSource("cafes") as mapboxgl.GeoJSONSource).setData(currentFeatures.current);
    });

    map.on("click", (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ["cafe-cluster", "cafe-point"] })[0];
      if (!f) {
        setSelectedId(null);
        return;
      }
      if (f.properties?.cluster) {
        (map.getSource("cafes") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.3 });
        });
        return;
      }
      if (f.properties?.id) setSelectedId(f.properties.id as string);
    });
    for (const id of ["cafe-cluster", "cafe-point"]) {
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
      features: listed.map(({ cafe }) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [cafe.lng, cafe.lat] },
        properties: { id: cafe.id, sel: cafe.id === selectedId ? 1 : 0, focus: cafe.focus ? 1 : 0 },
      })),
    };
    (mapRef.current?.getSource("cafes") as mapboxgl.GeoJSONSource | undefined)?.setData(currentFeatures.current);
  }, [listed, selectedId]);

  // Frame the map: the whole country with no search, the area around you after one.
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
    const near = listed.slice(0, 8);
    if (near.length === 0) {
      map.flyTo({ center: [origin.lng, origin.lat], zoom: 8, duration: 900 });
      return;
    }
    const b = new mapboxgl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
    for (const { cafe } of near) b.extend([cafe.lng, cafe.lat]);
    map.fitBounds(b, { padding: 70, maxZoom: 13, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, radius, all]);

  function select(id: string) {
    setSelectedId(id);
    const c = all?.find((x) => x.id === id);
    if (c) mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: Math.max(mapRef.current.getZoom(), 14), duration: 800 });
  }

  useEffect(() => {
    const map = mapRef.current;
    const prev = popupRef.current;
    popupRef.current = null;
    prev?.remove();
    const c = selectedId ? all?.find((x) => x.id === selectedId) : null;
    if (!map || !c) return;
    const popup = new mapboxgl.Popup({ offset: 14, maxWidth: "300px", closeButton: true, closeOnClick: false, className: "store-popup" }).setLngLat([c.lng, c.lat]).setDOMContent(buildPopup(c)).addTo(map);
    popup.on("close", () => {
      if (popupRef.current === popup) setSelectedId(null);
    });
    popupRef.current = popup;
  }, [selectedId, all]);

  useEffect(() => {
    if (selectedId) cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  function locate(auto = false) {
    if (!navigator.geolocation) {
      if (!auto) setMessage("Your browser can't share its location. Search by ZIP code or city instead.");
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
        if (!auto) setMessage(err.code === 1 ? "Location access was blocked. Search by ZIP code or city instead." : "We couldn't get your location. Search by ZIP code or city instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // If the visitor has already allowed location for this site, start near them without asking again.
  useEffect(() => {
    let live = true;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => live && p.state === "granted" && locate(true))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

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

  function clearSearch() {
    setOrigin(null);
    setQuery("");
    setMessage(null);
    setSelectedId(null);
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const fieldClass = "border border-line-strong rounded-sm px-3 py-2.5 bg-paper text-sm text-ink focus:outline-none focus:border-matcha";
  const label = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";

  return (
    <div>
      <form onSubmit={runSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="cafe-q" className={label}>
            ZIP code or city
          </label>
          <div className="flex gap-2">
            <input id="cafe-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. 90028 or Austin, TX" autoComplete="postal-code" className={`${fieldClass} flex-1 min-w-0`} />
            <button type="submit" disabled={busy !== null || !query.trim()} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper hover:bg-forest transition-colors disabled:opacity-50">
              {busy === "search" ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
        <button type="button" onClick={() => locate()} disabled={busy !== null} className="rounded-sm border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-matcha transition-colors disabled:opacity-50">
          {busy === "locate" ? "Locating…" : "Use my location"}
        </button>
        <div>
          <label htmlFor="cafe-name" className={label}>
            Café name
          </label>
          <input id="cafe-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Filter by name" className={`${fieldClass} w-full lg:w-44`} />
        </div>
        <div>
          <label htmlFor="cafe-radius" className={label}>
            Within
          </label>
          <select id="cafe-radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} disabled={!origin} className={`${fieldClass} w-full lg:w-32 disabled:opacity-50`}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? "Any distance" : `${r} miles`}
              </option>
            ))}
          </select>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={focusOnly} onChange={(e) => setFocusOnly(e.target.checked)} className="accent-matcha" />
          Matcha-focused cafés only
        </label>
        <p className="text-xs text-ink-faint">Your location is used only in your browser to sort this list. We don&apos;t send it anywhere or store it.</p>
      </div>
      {message && (
        <p className="mt-3 rounded-sm border border-line bg-paper-raised px-3 py-2 text-sm text-ink-muted" role="status">
          {message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-5">
        <div className="relative h-[360px] lg:h-[680px] rounded-sm overflow-hidden border border-line">
          {token ? <div ref={containerRef} className="h-full w-full" /> : <div className="flex h-full items-center justify-center text-ink-muted">Map token not configured.</div>}
        </div>

        <section aria-label="Cafés" className="lg:h-[680px] lg:overflow-y-auto">
          {loadError ? (
            <p className="text-sm text-ink-muted">The café list couldn&apos;t be loaded. Please refresh the page.</p>
          ) : all === null ? (
            <p className="text-sm text-ink-muted">Loading cafés…</p>
          ) : (
            <p className="text-sm text-ink-muted mb-3" aria-live="polite">
              {origin
                ? `${listed.length.toLocaleString()} café${listed.length === 1 ? "" : "s"}${radius > 0 ? ` within ${radius} miles of` : " near"} ${origin.label}`
                : `${listed.length.toLocaleString()} cafés listed across the US. Search a ZIP code or use your location to see the ones near you.`}
              {origin && (
                <button type="button" onClick={clearSearch} className="ml-2 text-matcha hover:text-forest underline">
                  Clear
                </button>
              )}
            </p>
          )}

          {origin && all && listed.length === 0 && (
            <div className="rounded-sm border border-line bg-paper-raised p-4 text-sm text-ink-muted">
              <p>No cafés listed within {radius} miles yet.</p>
              {nearest && (
                <p className="mt-2">
                  The nearest we have is <strong className="text-ink">{nearest.cafe.name}</strong> in {nearest.cafe.city}, {nearest.cafe.state}, about {Math.round(nearest.miles ?? 0).toLocaleString()} miles away.{" "}
                  <button type="button" onClick={() => setRadius(0)} className="text-matcha hover:text-forest underline">
                    Show all distances
                  </button>
                </p>
              )}
              <p className="mt-2">Know a café near you with matcha on the menu? Tell us below.</p>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {listed.filter((x, i) => showAll || i < LIST_CAP || x.cafe.id === selectedId).map(({ cafe: c, miles }) => (
              <li
                key={c.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(c.id, el);
                  else cardRefs.current.delete(c.id);
                }}
                className={`rounded-sm border bg-paper-raised p-4 transition-colors ${selectedId === c.id ? "border-matcha bg-matcha-soft" : "border-line"}`}
              >
                <button type="button" onClick={() => select(c.id)} className="block w-full text-left">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-semibold text-ink">{c.name}</span>
                    {miles != null && <span className="text-xs tabular-nums text-matcha whitespace-nowrap">{miles < 10 ? miles.toFixed(1) : Math.round(miles).toLocaleString()} mi</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{place(c)}</span>
                </button>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-matcha-soft px-2 py-0.5 text-matcha-ink">Matcha on their site</span>
                  {c.focus && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">Matcha-focused</span>}
                </p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <Link href={`/cafes/${cafeSlug(c)}`} className="font-medium text-matcha hover:text-forest">
                    Menu, ratings and photos
                  </Link>
                  <a href={directionsUrl(c)} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                    Directions
                  </a>
                </p>
              </li>
            ))}
          </ul>
          {!showAll && listed.length > LIST_CAP && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm text-matcha hover:text-forest underline text-left">
              Show all {listed.length.toLocaleString()} cafés
            </button>
          )}
          {!origin && all && total === 0 && <p className="text-sm text-ink-muted">No cafés match.</p>}
        </section>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Know a café with matcha that&apos;s missing, or see something out of date?{" "}
        <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("MatchaDB café suggestion")}&body=${encodeURIComponent("Café name:\nAddress:\nWebsite or menu link showing matcha:\n")}`} className="text-matcha hover:text-forest underline">
          Email us
        </a>
        .
      </p>
    </div>
  );
}
