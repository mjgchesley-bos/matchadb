"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapLocation } from "@/lib/map-data";
import { BrandLogo, gradeLabel } from "@/components/product-cards";
import { getBrandLogoPath, logoNeedsInvert } from "@/lib/logos";

// Full-screen sourcing map: regions, named districts and verified farms as
// pins; click one to fly in and open its detail panel. It shows where the
// LEAF IS GROWN as each brand's own page states it -- never company
// headquarters. Boundaries are real administrative areas only; no farm
// property outlines are drawn because no public registry of them exists.

type Filters = { grades: string[]; organic: boolean; brand: string | null };
type MapStyle = "light" | "satellite";
type Tab = "overview" | "brands" | "products";

const STYLES: Record<MapStyle, string> = {
  light: "mapbox://styles/mapbox/light-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
};
// Opening view: Japan's tea country, with Taiwan and Zhejiang still in frame on a wide screen.
const homeView = (): { center: [number, number]; zoom: number } =>
  typeof window !== "undefined" && window.innerWidth < 700 ? { center: [132.5, 33.5], zoom: 3.5 } : { center: [130, 33.4], zoom: 4.5 };
const PLACE_MIN_ZOOM = 6.5;
const REGION_BADGE_MAX_ZOOM = 10.5;

const usd = (n: number | null) => (n == null ? "n/a" : `$${n.toFixed(2)}`);

function countFor(l: MapLocation, f: Filters): number {
  if (f.brand) return l.brandCounts.find((b) => b.name === f.brand)?.count ?? 0;
  if (!f.grades.length && !f.organic) return l.products;
  if (f.grades.length) {
    return f.grades.reduce((sum, g) => sum + (f.organic ? (l.gradeOrganic[g] ?? 0) : (l.grades.find((x) => x.name === g)?.count ?? 0)), 0);
  }
  return l.organicCount;
}

// A town or ward outline is only a few pixels across at the all-of-East-Asia
// zoom; selecting it flies the camera to the outline's real extent.
function boundsOf(geometry: GeoJSON.Geometry): mapboxgl.LngLatBounds {
  const bounds = new mapboxgl.LngLatBounds();
  const walk = (coords: unknown, depth: number) => {
    if (depth === 0) bounds.extend(coords as [number, number]);
    else (coords as unknown[]).forEach((c) => walk(c, depth - 1));
  };
  const depth = geometry.type === "MultiPolygon" ? 3 : geometry.type === "Polygon" ? 2 : 0;
  if ("coordinates" in geometry) walk(geometry.coordinates, depth);
  return bounds;
}

function boundsArea(b: mapboxgl.LngLatBounds): number {
  return (b.getEast() - b.getWest()) * (b.getNorth() - b.getSouth());
}

async function fetchBoundary(key: string): Promise<GeoJSON.Feature | null> {
  try {
    const res = await fetch(`/region-boundaries/${encodeURIComponent(key)}.geojson`);
    return res.ok ? ((await res.json()) as GeoJSON.Feature) : null;
  } catch {
    return null;
  }
}

// Regions go in their own source so nearby ones (Uji, Kyoto, Wazuka, Nara...)
// can cluster into one badge at low zoom; districts and farms are never clustered.
function locationsGeoJSON(locs: MapLocation[], f: Filters, selectedId: string | null): { regions: GeoJSON.FeatureCollection; pins: GeoJSON.FeatureCollection } {
  const make = (kinds: string[]): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: locs.flatMap((l) => {
      const count = countFor(l, f);
      if (!count || !kinds.includes(l.kind)) return [];
      return [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
          properties: { id: l.id, kind: l.kind, name: l.name, count, sel: l.id === selectedId ? 1 : 0 },
        },
      ];
    }),
  });
  return { regions: make(["region"]), pins: make(["place", "farm"]) };
}

// When a region or district is selected, the brands that source from it fan out
// around the middle of the place as pins, each linking to that brand's page.
// Brands almost always name only the region or district, not a farm, so the
// pins deliberately share one point and fan out from it rather than being
// scattered across the outline, which would invent locations nobody disclosed.
// Fewer, tighter pins on a phone-width map so the fan stays on screen.
const FAN_MAX = 30;
const FAN_MAX_NARROW = 16;
const FAN_RINGS = [
  { r: 100, cap: 10 },
  { r: 156, cap: 16 },
  { r: 212, cap: 24 },
];
const FAN_RINGS_NARROW = [
  { r: 62, cap: 7 },
  { r: 102, cap: 10 },
];

function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

function buildFan(brands: { name: string; count: number }[], overflow: number, onMore: () => void, narrow: boolean): HTMLElement {
  type Item = { kind: "brand"; name: string; count: number } | { kind: "more"; n: number };
  const items: Item[] = [...brands.map((b) => ({ kind: "brand" as const, name: b.name, count: b.count })), ...(overflow > 0 ? [{ kind: "more" as const, n: overflow }] : [])];

  const root = document.createElement("div");
  root.className = "matcha-fan";
  root.style.cssText = "position:relative;width:0;height:0;pointer-events:none;";
  // Keep clicks and touches on the pins from reaching the map underneath.
  for (const type of ["mousedown", "touchstart", "pointerdown", "click", "dblclick"]) root.addEventListener(type, (e) => e.stopPropagation());

  // A handful of brands sit on one small ring; more spill onto outer rings.
  const rings: { r: number; items: Item[] }[] = [];
  if (items.length <= 8) {
    rings.push({ r: Math.max(narrow ? 56 : 66, items.length * (narrow ? 11 : 14)), items });
  } else {
    let i = 0;
    for (const ring of narrow ? FAN_RINGS_NARROW : FAN_RINGS) {
      if (i >= items.length) break;
      rings.push({ r: ring.r, items: items.slice(i, i + ring.cap) });
      i += ring.cap;
    }
  }

  let order = 0;
  rings.forEach((ring, ringIndex) => {
    const step = (Math.PI * 2) / ring.items.length;
    const start = -Math.PI / 2 + (ringIndex % 2 ? step / 2 : 0);
    ring.items.forEach((item, k) => {
      const theta = start + step * k;
      const x = Math.cos(theta) * ring.r;
      const y = Math.sin(theta) * ring.r;
      const delay = order++ * 22;

      const line = document.createElement("div");
      line.style.cssText = `position:absolute;left:0;top:0;width:${ring.r}px;height:1px;background:rgba(43,90,32,0.28);transform-origin:0 50%;transform:rotate(${theta}rad);opacity:0;transition:opacity .3s ${delay}ms;`;
      root.appendChild(line);

      const el = (item.kind === "brand" ? document.createElement("a") : document.createElement("button")) as HTMLAnchorElement | HTMLButtonElement;
      el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:9999px;background:#fff6df;border:2px solid #3c7a2a;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;opacity:0;transform:scale(0.4);transition:transform .35s cubic-bezier(.2,.9,.3,1.3),opacity .25s ${delay}ms,transform .35s ${delay}ms;font:700 12px var(--font-manrope), sans-serif;color:#1f3d17;text-decoration:none;padding:0;`;

      let labelText: string;
      if (item.kind === "brand") {
        const a = el as HTMLAnchorElement;
        a.href = `/brands/${encodeURIComponent(item.name)}`;
        labelText = `${item.name} · ${item.count} product${item.count === 1 ? "" : "s"} here`;
        a.setAttribute("aria-label", `${item.name}, ${item.count} product${item.count === 1 ? "" : "s"} from here. Open the brand page.`);
        const logo = getBrandLogoPath(item.name);
        if (logo) {
          const img = document.createElement("img");
          img.src = logo;
          img.alt = "";
          img.style.cssText = `width:100%;height:100%;object-fit:contain;padding:6px;border-radius:9999px;${logoNeedsInvert(item.name) ? "filter:invert(1);" : ""}`;
          el.appendChild(img);
        } else {
          el.textContent = initialsOf(item.name);
        }
        if (item.count > 1) {
          const badge = document.createElement("span");
          badge.textContent = String(item.count);
          badge.style.cssText = "position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;padding:0 4px;border-radius:9999px;background:#3c7a2a;color:#fff6df;font:700 10px var(--font-manrope), sans-serif;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff6df;";
          el.appendChild(badge);
        }
      } else {
        (el as HTMLButtonElement).type = "button";
        el.textContent = `+${item.n}`;
        el.style.background = "#3c7a2a";
        el.style.color = "#fff6df";
        labelText = `${item.n} more brand${item.n === 1 ? "" : "s"}: see the Brands tab`;
        el.setAttribute("aria-label", labelText);
        el.addEventListener("click", onMore);
      }

      const label = document.createElement("span");
      label.textContent = labelText;
      label.style.cssText = "display:none;position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:5px;white-space:nowrap;background:rgba(31,61,23,0.94);color:#fff6df;padding:3px 9px;border-radius:9999px;font:600 11px var(--font-manrope), sans-serif;pointer-events:none;z-index:5;";
      el.appendChild(label);
      const showLabel = () => {
        label.style.display = "block";
        el.style.zIndex = "3";
      };
      const hideLabel = () => {
        label.style.display = "none";
        el.style.zIndex = "";
      };
      el.addEventListener("mouseenter", showLabel);
      el.addEventListener("mouseleave", hideLabel);
      el.addEventListener("focus", showLabel);
      el.addEventListener("blur", hideLabel);

      root.appendChild(el);
      setTimeout(() => {
        line.style.opacity = "1";
        el.style.opacity = "1";
        el.style.transform = "scale(1)";
      }, 30);
    });
  });
  return root;
}

export function SourcingExplorer({ locations, totalProducts }: { locations: MapLocation[]; totalProducts: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const boundariesRef = useRef<Map<string, GeoJSON.Feature>>(new Map());
  const areaRef = useRef<Map<string, number>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("light");
  const [filters, setFilters] = useState<Filters>({ grades: [], organic: false, brand: null });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [view, setView] = useState<{ zoom: number; ids: string[] }>({ zoom: 4.5, ids: [] });
  const [fanReady, setFanReady] = useState(false);

  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const allGrades = useMemo(() => {
    const c = new Map<string, number>();
    for (const l of locations) if (l.kind === "region") for (const g of l.grades) if (g.name !== "Not stated") c.set(g.name, (c.get(g.name) ?? 0) + g.count);
    return [...c].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [locations]);

  // Latest state for map event handlers, which are registered once.
  const live = useRef({ filters, selectedId, mapStyle, locations, byId });
  useEffect(() => {
    live.current = { filters, selectedId, mapStyle, locations, byId };
  });

  function select(id: string | null) {
    setSelectedId(id);
    if (id) setTab("overview");
  }

  // ---- map setup (once) ----
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLES.light,
      ...homeView(),
      minZoom: 2,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    let alive = true;

    const boundariesReady = (async () => {
      const withBoundary = locations.filter((l) => l.boundaryKey);
      const fetched = await Promise.all(withBoundary.map((l) => fetchBoundary(l.boundaryKey!)));
      withBoundary.forEach((l, i) => {
        const f = fetched[i];
        if (!f) return;
        boundariesRef.current.set(l.id, { ...f, properties: { ...(f.properties ?? {}), id: l.id } });
        areaRef.current.set(l.id, boundsArea(boundsOf(f.geometry)));
      });
    })();

    // Re-run on every style load: switching between the plain map and the
    // satellite view replaces the whole style, which drops our sources/layers.
    async function setupLayers() {
      await boundariesReady;
      if (!alive) return;
      const { filters: f, selectedId: sel, mapStyle: ms, locations: locs } = live.current;
      const sat = ms === "satellite";
      const text = sat ? "#fff6df" : "#1f3d17";
      const halo = sat ? "#1f3d17" : "#fff6df";

      if (sat) {
        map.addSource("mapbox-dem", { type: "raster-dem", url: "mapbox://mapbox.mapbox-terrain-dem-v1", tileSize: 512, maxzoom: 14 });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
      }

      map.addSource("boundaries", {
        type: "geojson",
        promoteId: "id",
        data: { type: "FeatureCollection", features: [...boundariesRef.current.values()] },
      });
      map.addLayer({
        id: "b-fill",
        type: "fill",
        source: "boundaries",
        paint: {
          "fill-color": sat ? "#b9e08a" : "#3c7a2a",
          "fill-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 0.32, ["boolean", ["feature-state", "dim"], false], 0.03, 0.16],
        },
      });
      map.addLayer({
        id: "b-line",
        type: "line",
        source: "boundaries",
        paint: {
          "line-color": sat ? "#fff6df" : "#2b5a20",
          "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 3.5, 1.6],
          "line-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0.25, 1],
        },
      });

      const geo = locationsGeoJSON(locs, f, sel);
      map.addSource("regions", {
        type: "geojson",
        data: geo.regions,
        cluster: true,
        clusterRadius: 34,
        clusterMaxZoom: 6,
        clusterProperties: { total: ["+", ["get", "count"]] },
      });
      map.addSource("pins", { type: "geojson", data: geo.pins });
      const clustered: mapboxgl.Expression = ["has", "point_count"];
      const single: mapboxgl.Expression = ["!", ["has", "point_count"]];
      // Districts, towns and verified farms all use the same dot: one shape for "a place inside a region".
      const subRegion: mapboxgl.Expression = ["in", ["get", "kind"], ["literal", ["place", "farm"]]];
      map.addLayer({
        id: "reg-cluster",
        type: "circle",
        source: "regions",
        filter: clustered,
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 17, 3, 21],
          "circle-color": "#f6f1e4",
          "circle-stroke-color": "#3c7a2a",
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "reg-cluster-count",
        type: "symbol",
        source: "regions",
        filter: clustered,
        layout: { "text-field": ["to-string", ["get", "total"]], "text-size": 11, "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-allow-overlap": true },
        paint: { "text-color": "#222818" },
      });
      map.addLayer({
        id: "reg-circle",
        type: "circle",
        source: "regions",
        filter: single,
        maxzoom: REGION_BADGE_MAX_ZOOM,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "count"]], 1, 11, 18, 22],
          "circle-color": ["case", ["==", ["get", "sel"], 1], "#3c7a2a", "#f6f1e4"],
          "circle-stroke-color": "#3c7a2a",
          "circle-stroke-width": 2.5,
        },
      });
      map.addLayer({
        id: "reg-count",
        type: "symbol",
        source: "regions",
        filter: single,
        maxzoom: REGION_BADGE_MAX_ZOOM,
        layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 11, "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-allow-overlap": true },
        paint: { "text-color": ["case", ["==", ["get", "sel"], 1], "#fff6df", "#222818"] },
      });
      map.addLayer({
        id: "reg-label",
        type: "symbol",
        source: "regions",
        filter: single,
        minzoom: 4.3,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.9],
          "text-anchor": "top",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "symbol-sort-key": ["*", -1, ["get", "count"]],
        },
        paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.6 },
      });
      map.addLayer({
        id: "place-dot",
        type: "circle",
        source: "pins",
        filter: subRegion,
        minzoom: PLACE_MIN_ZOOM,
        paint: {
          "circle-radius": ["case", ["==", ["get", "sel"], 1], 10, ["interpolate", ["linear"], ["get", "count"], 2, 6, 20, 10]],
          "circle-color": ["case", ["==", ["get", "sel"], 1], "#2b5a20", "#3c7a2a"],
          "circle-stroke-color": "#fff6df",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "place-label",
        type: "symbol",
        source: "pins",
        filter: subRegion,
        minzoom: 7,
        layout: {
          "text-field": ["concat", ["get", "name"], " · ", ["to-string", ["get", "count"]]],
          "text-size": 12,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "symbol-sort-key": ["*", -1, ["get", "count"]],
        },
        paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.6 },
      });
      applyStates();
    }

    function applyStates() {
      if (!map.getSource("boundaries")) return;
      const { filters: f, selectedId: sel, locations: locs } = live.current;
      for (const l of locs) {
        if (!boundariesRef.current.has(l.id)) continue;
        map.setFeatureState({ source: "boundaries", id: l.id }, { sel: l.id === sel, dim: countFor(l, f) === 0 });
      }
    }
    (map as unknown as { __apply: () => void }).__apply = applyStates;

    map.on("style.load", setupLayers);

    const hitLayers = ["place-dot", "reg-cluster", "reg-circle", "b-fill"];
    map.on("click", (e) => {
      if ((e.originalEvent?.target as HTMLElement | null)?.closest?.(".matcha-fan")) return;
      const layers = hitLayers.filter((id) => map.getLayer(id));
      const feats = map.queryRenderedFeatures(e.point, { layers });
      if (!feats.length) return;
      // Pins beat outlines; among overlapping outlines the smallest one wins (Uji inside Kyoto).
      const ranked = [...feats].sort((a, b) => hitLayers.indexOf(a.layer!.id) - hitLayers.indexOf(b.layer!.id));
      const cluster = ranked.find((f) => f.layer!.id === "reg-cluster");
      if (cluster && !ranked.some((f) => f.layer!.id === "place-dot")) {
        // A cluster of nearby regions: zoom in until they separate.
        const src = map.getSource("regions") as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(cluster.properties!.cluster_id as number, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center: (cluster.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.3, duration: 700 });
        });
        return;
      }
      const pin = ranked.find((f) => f.layer!.id !== "b-fill" && f.layer!.id !== "reg-cluster");
      const pick = pin ?? [...ranked].sort((a, b) => (areaRef.current.get(String(a.properties?.id)) ?? 1e9) - (areaRef.current.get(String(b.properties?.id)) ?? 1e9))[0];
      const id = pick.properties?.id as string | undefined;
      if (id) select(id);
    });
    for (const id of hitLayers) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }

    const updateView = () => {
      const b = map.getBounds();
      if (!b) return;
      const { filters: f, locations: locs } = live.current;
      const zoom = map.getZoom();
      const ids = locs
        .filter((l) => countFor(l, f) > 0 && b.contains([l.lng, l.lat]) && (l.kind === "region" || zoom >= PLACE_MIN_ZOOM - 0.5))
        .sort((a, b2) => (a.kind === b2.kind ? countFor(b2, f) - countFor(a, f) : a.kind === "region" ? -1 : 1))
        .map((l) => l.id);
      setView({ zoom, ids });
    };
    map.on("moveend", updateView);
    map.on("load", updateView);

    return () => {
      alive = false;
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // Registered once; later state reaches handlers through `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- keep the map in sync with filters and selection ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const geo = locationsGeoJSON(locations, filters, selectedId);
    (map.getSource("regions") as mapboxgl.GeoJSONSource | undefined)?.setData(geo.regions);
    (map.getSource("pins") as mapboxgl.GeoJSONSource | undefined)?.setData(geo.pins);
    (map as unknown as { __apply?: () => void }).__apply?.();
    const b = map.getBounds();
    if (b) {
      const zoom = map.getZoom();
      const ids = locations
        .filter((l) => countFor(l, filters) > 0 && b.contains([l.lng, l.lat]) && (l.kind === "region" || zoom >= PLACE_MIN_ZOOM - 0.5))
        .sort((a, c) => (a.kind === c.kind ? countFor(c, filters) - countFor(a, filters) : a.kind === "region" ? -1 : 1))
        .map((l) => l.id);
      setView({ zoom, ids });
    }
  }, [filters, selectedId, locations]);

  // ---- fly in on selection ----
  const firstSelect = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (firstSelect.current) {
      firstSelect.current = false;
      if (!selectedId) return;
    }
    const sat = mapStyle === "satellite";
    const tilt = { pitch: sat ? 55 : 0, bearing: sat ? -18 : 0 };
    if (!selected) {
      map.flyTo({ ...homeView(), pitch: 0, bearing: 0, duration: 1200 });
      return;
    }
    const boundary = boundariesRef.current.get(selected.id);
    if (boundary && selected.kind !== "place") {
      map.fitBounds(boundsOf(boundary.geometry), { padding: 70, duration: 1700, maxZoom: selected.kind === "farm" ? 12.5 : 11, ...tilt });
    } else {
      map.flyTo({ center: [selected.lng, selected.lat], zoom: selected.kind === "region" ? 6 : selected.kind === "farm" ? 12.5 : 11.5, duration: 1700, ...tilt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- brand pins for the selected place ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    const brands = filters.brand ? selected.brandCounts.filter((b) => b.name === filters.brand) : selected.brandCounts;
    if (!brands.length) return;
    let marker: mapboxgl.Marker | null = null;
    let cancelled = false;
    const show = () => {
      if (cancelled || marker) return;
      const narrow = (containerRef.current?.clientWidth ?? window.innerWidth) < 700;
      const shown = brands.slice(0, narrow ? FAN_MAX_NARROW : FAN_MAX);
      const el = buildFan(shown, brands.length - shown.length, () => setTab("brands"), narrow);
      // Fan from the middle of the region outline the map just flew to, or from the point itself for a district or farm.
      const boundary = boundariesRef.current.get(selected.id);
      const center = boundary && selected.kind === "region" ? boundsOf(boundary.geometry).getCenter() : new mapboxgl.LngLat(selected.lng, selected.lat);
      // On a phone the map is short and the search controls sit along the top, so nudge the fan down.
      marker = new mapboxgl.Marker({ element: el, anchor: "center", offset: narrow ? [0, 44] : [0, 0] }).setLngLat(center).addTo(map);
      setFanReady(true);
    };
    map.once("moveend", show);
    const timer = setTimeout(show, 2600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map.off("moveend", show);
      marker?.remove();
      setFanReady(false);
    };
  }, [selected, filters.brand]);

  function switchStyle(next: MapStyle) {
    const map = mapRef.current;
    if (!map || next === mapStyle) return;
    setMapStyle(next);
    live.current.mapStyle = next;
    map.setStyle(STYLES[next]);
    map.once("style.load", () => {
      if (next === "satellite" && selected) map.easeTo({ pitch: 55, bearing: -18, duration: 900 });
      if (next === "light") map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    });
  }

  // ---- search ----
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { places: [] as MapLocation[], brands: [] as { name: string; where: number }[] };
    const places = locations.filter((l) => l.name.toLowerCase().includes(q) || l.sub.toLowerCase().includes(q)).slice(0, 6);
    const brandMap = new Map<string, number>();
    for (const l of locations) if (l.kind === "region") for (const b of l.brandCounts) brandMap.set(b.name, (brandMap.get(b.name) ?? 0) + 1);
    const brands = [...brandMap].filter(([n]) => n.toLowerCase().includes(q)).slice(0, 5).map(([name, where]) => ({ name, where }));
    return { places, brands };
  }, [query, locations]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return <div className="border border-line rounded-sm p-8 text-center text-ink-muted">Map token not configured.</div>;
  }

  const activeFilters = filters.grades.length + (filters.organic ? 1 : 0) + (filters.brand ? 1 : 0);
  const visible = view.ids.map((id) => byId.get(id)).filter((l): l is MapLocation => !!l);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-4.5rem)] min-h-[620px] border-b border-line">
      <div className="relative flex-1 min-h-[320px] lg:min-h-0">
        <div className="absolute inset-0">
          <div ref={containerRef} className="h-full w-full" />
        </div>

        {/* Search + filters + view toggle */}
        <div className="absolute left-3 top-3 right-14 flex flex-col gap-2 sm:max-w-[26rem]">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search regions, districts, brands…"
              aria-label="Search the sourcing map"
              className="w-full rounded-full border border-line-strong bg-paper-raised/95 px-4 py-2.5 text-sm text-ink shadow-sm placeholder:text-ink-faint focus:outline-none focus:border-matcha"
            />
            {(results.places.length > 0 || results.brands.length > 0) && (
              <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-sm border border-line bg-paper-raised shadow-md text-sm">
                {results.places.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        select(l.id);
                        setQuery("");
                      }}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-matcha-soft"
                    >
                      <span className="text-ink">{l.name}<span className="text-ink-faint">, {l.sub}</span></span>
                      <span className="text-xs text-ink-faint">{l.kind === "region" ? "region" : l.kind === "place" ? "district" : "farm"}</span>
                    </button>
                  </li>
                ))}
                {results.brands.map((b) => (
                  <li key={b.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ grades: [], organic: false, brand: b.name });
                        select(null);
                        setQuery("");
                      }}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-matcha-soft"
                    >
                      <span className="text-ink">{b.name}</span>
                      <span className="text-xs text-ink-faint">brand · grown in {b.where} region{b.where === 1 ? "" : "s"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className="rounded-full border border-line-strong bg-paper-raised/95 px-4 py-1.5 text-sm text-ink shadow-sm hover:border-matcha"
            >
              Filters{activeFilters ? ` · ${activeFilters}` : ""}
            </button>
            <div className="inline-flex overflow-hidden rounded-full border border-line-strong bg-paper-raised/95 text-sm shadow-sm" role="group" aria-label="Map style">
              {(["light", "satellite"] as MapStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => switchStyle(s)}
                  aria-pressed={mapStyle === s}
                  className={`px-3.5 py-1.5 ${mapStyle === s ? "bg-matcha text-paper" : "text-ink-muted hover:text-ink"}`}
                >
                  {s === "light" ? "Map" : "Satellite"}
                </button>
              ))}
            </div>
            {filters.brand && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, brand: null })}
                className="inline-flex items-center gap-1.5 rounded-full bg-matcha px-3 py-1.5 text-sm text-paper shadow-sm"
              >
                {filters.brand} <span aria-hidden="true">✕</span>
                <span className="sr-only">Clear brand filter</span>
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="rounded-sm border border-line bg-paper-raised/95 p-3 shadow-md text-sm">
              <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-faint mb-2">Grade</p>
              <div className="flex flex-wrap gap-2">
                {allGrades.map((g) => {
                  const on = filters.grades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={!!filters.brand}
                      onClick={() => setFilters({ ...filters, grades: on ? filters.grades.filter((x) => x !== g) : [...filters.grades, g] })}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1 disabled:opacity-40 ${on ? "border-matcha bg-matcha text-paper" : "border-line-strong text-ink-muted hover:border-matcha"}`}
                    >
                      {gradeLabel(g)}
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex items-center gap-2 text-ink-muted">
                <input
                  type="checkbox"
                  checked={filters.organic}
                  disabled={!!filters.brand}
                  onChange={(e) => setFilters({ ...filters, organic: e.target.checked })}
                  className="accent-matcha"
                />
                Organic-certified only
              </label>
              {activeFilters > 0 && (
                <button type="button" onClick={() => setFilters({ grades: [], organic: false, brand: null })} className="mt-3 text-matcha hover:text-forest">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {fanReady && (
          <p className="pointer-events-none absolute bottom-6 right-3 hidden max-w-[16rem] sm:block rounded-sm border border-line bg-paper-raised/95 px-3 py-2 text-xs text-ink-muted shadow-sm">
            Pins fan out from the middle of the place. These brands name it as a source, not an exact farm. Click a pin for the brand page.
          </p>
        )}

        {/* Legend */}
        <ul className="absolute bottom-6 left-3 hidden sm:flex flex-col gap-1.5 rounded-sm border border-line bg-paper-raised/95 px-3 py-2 text-xs text-ink-muted shadow-sm" aria-label="Map legend">
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-matcha bg-paper px-1 text-[10px] font-semibold text-ink">12</span>
            Growing region and its product count
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-paper bg-matcha ring-1 ring-matcha" />
            District, town or farm (zoom in)
          </li>
        </ul>
      </div>

      <aside className="h-[46%] lg:h-auto lg:w-[20.8rem] shrink-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-line bg-paper-raised" aria-label="Location details">
        {selected ? (
          <DetailPanel loc={selected} tab={tab} setTab={setTab} filters={filters} onBack={() => select(null)} />
        ) : (
          <ExplorePanel locations={visible} filters={filters} zoom={view.zoom} totalProducts={totalProducts} onPick={select} />
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- panels

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border border-line bg-paper px-3 py-2.5">
      <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-faint">{label}</p>
      <p className="font-display text-xl font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-[0.7rem] text-ink-faint">{sub}</p>}
    </div>
  );
}

function ExplorePanel({
  locations,
  filters,
  zoom,
  totalProducts,
  onPick,
}: {
  locations: MapLocation[];
  filters: Filters;
  zoom: number;
  totalProducts: number;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <div className="bg-matcha px-5 py-5 text-paper">
        <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-paper/80">Sourcing map</p>
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">Where the matcha is grown</h1>
        <p className="mt-2 text-sm text-paper/85 leading-relaxed">
          Growing regions as each brand&apos;s own page states them, out of {totalProducts.toLocaleString()} products. Click a region to fly in; zoom in for the districts and towns inside it.
        </p>
      </div>
      <p className="px-5 pt-4 pb-2 text-xs text-ink-faint">
        {zoom < PLACE_MIN_ZOOM - 0.5 ? "Regions in view. Zoom in to add districts and towns." : "Regions and districts in view. Pan or zoom and this list follows."}
      </p>
      {locations.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ink-muted">Nothing here matches. Zoom out, drag toward Japan, or clear the filters.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {locations.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => onPick(l.id)} className="w-full px-5 py-3 text-left hover:bg-matcha-soft transition-colors">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-ink-faint">, {l.sub}</span>
                  </span>
                  <span className="text-xs text-matcha tabular-nums whitespace-nowrap">{countFor(l, filters)} products</span>
                </span>
                <span className="mt-1 block text-xs text-ink-faint">
                  {l.kind === "place" ? "District named by brands · " : l.kind === "farm" ? "Verified farm · " : ""}
                  {l.brandCounts.slice(0, 4).map((b) => b.name).join(", ")}
                  {l.brandCounts.length > 4 ? ` +${l.brandCounts.length - 4} more` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailPanel({
  loc,
  tab,
  setTab,
  filters,
  onBack,
}: {
  loc: MapLocation;
  tab: Tab;
  setTab: (t: Tab) => void;
  filters: Filters;
  onBack: () => void;
}) {
  const filteredCount = countFor(loc, filters);
  const tabs: Tab[] = loc.kind === "farm" ? ["overview", "products"] : ["overview", "brands", "products"];
  const maxGrade = Math.max(1, ...loc.grades.map((g) => g.count));
  const params = new URLSearchParams();
  if (loc.regionKey) params.set("region", loc.regionKey);
  filters.grades.forEach((g) => params.append("grade", g));
  if (filters.organic) params.set("organicOnly", "1");
  if (filters.brand) params.set("brand", filters.brand);
  params.set("ships", "any");
  const browseHref = `/browse?${params.toString()}`;
  const kindLabel = loc.kind === "region" ? "Growing region" : loc.kind === "place" ? "District or town" : "Verified farm";
  const shownPicks = loc.picks.filter((p) => {
    if (filters.brand) return p.brand === filters.brand;
    if (filters.grades.length && !filters.grades.includes(p.grade ?? "Not stated")) return false;
    if (filters.organic && !p.organic) return false;
    return true;
  });

  return (
    <div>
      <div className="bg-matcha px-5 pt-4 pb-5 text-paper">
        <button type="button" onClick={onBack} className="text-xs text-paper/80 hover:text-paper">
          ← All locations
        </button>
        <p className="mt-3 inline-block rounded-full bg-paper/20 px-2.5 py-0.5 font-mono text-[0.6rem] tracking-[0.15em] uppercase">{kindLabel}</p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold leading-tight">{loc.name}</h2>
        <p className="text-sm text-paper/85">{loc.sub}</p>
        <p className="mt-2 text-sm text-paper/90 tabular-nums">
          {loc.products} product{loc.products === 1 ? "" : "s"} · {loc.brands} brand{loc.brands === 1 ? "" : "s"}
          {filteredCount !== loc.products ? ` · ${filteredCount} match your filters` : ""}
        </p>
      </div>

      <div className="flex border-b border-line px-3 pt-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px ${tab === t ? "border-matcha text-ink font-medium" : "border-transparent text-ink-faint hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-5 py-5 flex flex-col gap-5">
        {tab === "overview" && (
          <>
            {loc.intro && <p className="text-sm text-ink-muted leading-relaxed">{loc.intro}</p>}
            {loc.note && <p className="text-xs text-ink-faint leading-relaxed">{loc.note}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Median price" value={usd(loc.median)} sub={loc.pricedCount ? `per gram, ${loc.pricedCount} priced` : "no comparable prices"} />
              <Stat label="Middle half" value={loc.p25 != null && loc.p75 != null ? `${usd(loc.p25)}–${usd(loc.p75)}` : "n/a"} sub="per gram" />
              <Stat label="Organic" value={loc.products ? `${Math.round((loc.organicCount / loc.products) * 100)}%` : "n/a"} sub={`${loc.organicCount} of ${loc.products}`} />
              <Stat label="Brands" value={String(loc.brands)} sub="source from here" />
            </div>
            {loc.grades.length > 0 && (
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-forest mb-2">Grades (as brands label them)</p>
                <ul className="flex flex-col gap-1.5">
                  {loc.grades.map((g) => (
                    <li key={g.name} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-sm">
                      <span className="text-ink-muted truncate">{gradeLabel(g.name)}</span>
                      <span className="h-2 rounded-full bg-matcha-soft overflow-hidden">
                        <span className="block h-full rounded-full bg-matcha" style={{ width: `${(g.count / maxGrade) * 100}%` }} />
                      </span>
                      <span className="text-right text-ink-faint tabular-nums">{g.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {loc.cultivars.length > 0 && (
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-forest mb-2">Cultivars named</p>
                <div className="flex flex-wrap gap-1.5">
                  {loc.cultivars.map((c) => (
                    <span key={c.name} className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-ink-muted">
                      {c.name} <span className="text-ink-faint tabular-nums">{c.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {loc.flavors.length > 0 && (
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase text-forest mb-2">Flavor notes brands report</p>
                <div className="flex flex-wrap gap-1.5">
                  {loc.flavors.map((f) => (
                    <span key={f.tag} className="rounded-full bg-matcha-soft px-2.5 py-0.5 text-xs text-matcha-ink">
                      {f.tag} <span className="tabular-nums opacity-70">{Math.round(f.share * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="rounded-sm border border-line bg-paper px-3 py-2.5 text-xs text-ink-faint leading-relaxed">
              {loc.precision} This is where the brands say the leaf is grown, not where the company is based.
            </p>
            {loc.source && (
              <a href={loc.source.url} target="_blank" rel="noopener noreferrer" className="text-sm text-matcha hover:text-forest">
                {loc.source.label} &rarr;
              </a>
            )}
            {loc.regionSlug && (
              <Link href={`/regions/${loc.regionSlug}`} className="text-sm text-matcha hover:text-forest">
                Full {loc.regionKey} region page &rarr;
              </Link>
            )}
          </>
        )}

        {tab === "brands" && (
          <ul className="flex flex-col divide-y divide-line">
            {loc.brandCounts.map((b) => (
              <li key={b.name}>
                <Link href={`/brands/${encodeURIComponent(b.name)}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-matcha">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <BrandLogo brandName={b.name} size={24} maxWidth={64} />
                    <span className="truncate text-sm text-ink">{b.name}</span>
                  </span>
                  <span className="text-xs text-ink-faint tabular-nums whitespace-nowrap">{b.count} product{b.count === 1 ? "" : "s"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {tab === "products" && (
          <>
            {shownPicks.length === 0 ? (
              <p className="text-sm text-ink-muted">No sample products match the current filters. Use the link below for the full list.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {shownPicks.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="block py-2.5 hover:text-matcha">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-ink">{p.brand}</span>
                        <span className="text-xs text-ink tabular-nums whitespace-nowrap">{usd(p.perGram)}/g</span>
                      </span>
                      <span className="block text-xs text-ink-muted">{p.name}</span>
                      <span className="block text-[0.7rem] text-ink-faint">
                        {p.grade ? gradeLabel(p.grade) : "Grade not stated"}
                        {p.organic ? " · Organic" : ""}
                        {p.grams ? ` · ${Math.round(p.grams)} g` : ""}
                        {p.priceUsd ? ` · ${usd(p.priceUsd)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-ink-faint">A sample: one product per brand first, best-known brands first. Prices converted to US dollars.</p>
          </>
        )}

        <Link href={browseHref} className="inline-block self-start rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest transition-colors">
          {loc.kind === "place" ? `See all ${loc.regionKey} products` : `See all ${filteredCount} in the database`}
        </Link>
      </div>
    </div>
  );
}
