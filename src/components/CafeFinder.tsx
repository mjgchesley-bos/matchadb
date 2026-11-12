"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/i18n/Link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cafeSlug, directionsUrl, formatPlace, type CafeSlim } from "@/lib/cafe-types";
import { ALL_COUNTRIES, REGIONS, regionByKey, regionForCountry, type RegionKey } from "@/lib/cafe-regions";
import { KM_PER_MILE, geocodeMany, haversineMiles, type Origin } from "@/lib/geo";
import { nameScore, norm } from "@/lib/cafe-search";
import { useLang, useT } from "@/i18n/client";
import { INTL_LANG, localePath, type Locale } from "@/i18n/config";
import { rich } from "@/i18n/rich";
import { SuggestCafe } from "@/components/SuggestCafe";

// Find cafés near you whose own website lists matcha, in the US, Canada, Europe, Japan, South Korea and Australia.
// Search by ZIP, postcode or city, or use your device's location. Your position is only used in your
// browser to sort and map the list; nothing about it is sent to or stored by us. (A typed place is sent
// to Mapbox's geocoder to turn it into a point.)

type Cafe = { id: string; name: string; address: string; city: string; state: string; zip: string; lat: number; lng: number; focus: boolean; nameOnly: boolean; reported: boolean; cc: string };
type Listed = { cafe: Cafe; dist: number | null };
type Opt = { kind: "cafe"; cafe: Cafe; dist: number | null } | { kind: "place"; origin: Origin };

const RADII = [5, 10, 25, 50, 0]; // 0 = any distance
const LIST_CAP = 30;

const fromSlim = (r: CafeSlim): Cafe => ({ id: r[0], name: r[1], address: r[2], city: r[3], state: r[4], zip: r[5], lat: r[6], lng: r[7], focus: r[8] === 1 || r[8] === 2, nameOnly: r[8] === 2, reported: r[8] === 3, cc: r[9] ?? "US" });

// The popup over a pin. Built with DOM nodes and textContent so a café name can never inject markup.
function buildPopup(c: Cafe, lang: Locale, linkText: string): HTMLElement {
  const el = (tag: string, cls: string, text?: string) => {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const root = el("div", "store-pop");
  root.appendChild(el("p", "font-display text-base font-semibold text-ink leading-snug", c.name));
  root.appendChild(el("p", "mt-0.5 text-xs text-ink-muted", formatPlace(c, lang)));
  const a = el("a", "mt-2 inline-block text-sm font-medium text-matcha-ink underline underline-offset-2", linkText) as HTMLAnchorElement;
  a.href = localePath(lang, `/cafes/${cafeSlug(c)}`);
  root.appendChild(a);
  return root;
}

export function CafeFinder({ contactEmail, initialRegion = "us" }: { contactEmail: string; initialRegion?: RegionKey }) {
  const lang = useLang();
  const t = useT();
  const place = (c: Cafe) => formatPlace(c, lang);
  const regionLabel = (k: RegionKey) => t(`c.region.${k}` as "c.region.us");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const [regionKey, setRegionKey] = useState<RegionKey>(initialRegion);
  const region = regionByKey(regionKey);
  const unit = region.unit;
  // The list that was loaded, and which region it belongs to (so a region switch never shows the old list).
  const [loaded, setLoaded] = useState<{ region: RegionKey; list: Cafe[] } | null>(null);
  const all = loaded && loaded.region === regionKey ? loaded.list : null;
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  // One search bar: a café name narrows the list to those cafés (nameFilter); a place sets the origin.
  const [nameFilter, setNameFilter] = useState<{ label: string; ids: Set<string> } | null>(null);
  const [myLoc, setMyLoc] = useState<Origin | null>(null); // the visitor's own position, once known (for "closest to you")
  const [options, setOptions] = useState<{ q: string; list: Opt[] } | null>(null); // "did you mean" choices after a miss
  const [sugg, setSugg] = useState<Opt[]>([]); // live suggestions while typing
  const [suggOpen, setSuggOpen] = useState(false);
  const visibleSugg = suggOpen && query.trim().length >= 2 ? sugg : [];
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radius, setRadius] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"search" | "locate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/data/cafes-slim-${regionKey}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<CafeSlim[]>) : Promise.reject(new Error("load"))))
      .then((rows) => {
        if (!live) return;
        setLoadError(false);
        setLoaded({ region: regionKey, list: rows.map(fromSlim) });
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [regionKey]);

  const { listed, nearest, total } = useMemo(() => {
    const factor = unit === "km" ? KM_PER_MILE : 1;
    const matching: Listed[] = (all ?? [])
      .filter((c) => !nameFilter || nameFilter.ids.has(c.id))
      .map((cafe) => ({ cafe, dist: origin ? haversineMiles(origin, cafe) * factor : null }));
    if (!origin) {
      matching.sort((a, b) => a.cafe.cc.localeCompare(b.cafe.cc) || a.cafe.state.localeCompare(b.cafe.state) || a.cafe.city.localeCompare(b.cafe.city) || a.cafe.name.localeCompare(b.cafe.name));
      return { listed: matching, nearest: null as Listed | null, total: matching.length };
    }
    matching.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    const within = radius > 0 ? matching.filter((x) => (x.dist ?? 0) <= radius) : matching;
    return { listed: within, nearest: matching[0] ?? null, total: matching.length };
  }, [all, nameFilter, origin, radius, unit]);

  // Normalized names, computed once per loaded list, for fast matching.
  const normNames = useMemo(() => (all ?? []).map((c) => norm(c.name)), [all]);

  const currentFeatures = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });

  // ---- map ----
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/light-v11", bounds: regionByKey(initialRegion).bounds, fitBoundsOptions: { padding: 20 } });
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
          "circle-color": ["case", ["==", ["get", "sel"], 1], "#2b5a20", "#6aa84f"],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Frame the map: the whole region with no search, the area around you after one.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!origin) {
      map.fitBounds(region.bounds, { padding: 20, duration: 800 });
      return;
    }
    const el = document.createElement("div");
    el.style.cssText = "width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.35);";
    el.setAttribute("aria-label", t("c.cf.marker"));
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
  }, [origin, radius, all, regionKey]);

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
    const popup = new mapboxgl.Popup({ offset: 14, maxWidth: "300px", closeButton: true, closeOnClick: false, className: "store-popup" }).setLngLat([c.lng, c.lat]).setDOMContent(buildPopup(c, lang, t("c.cf.menu"))).addTo(map);
    popup.on("close", () => {
      if (popupRef.current === popup) setSelectedId(null);
    });
    popupRef.current = popup;
  }, [selectedId, all, lang, t]);

  useEffect(() => {
    if (selectedId) cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  // Switch to another part of the world.
  function changeRegion(k: RegionKey, keepOrigin?: Origin) {
    if (k === regionKey && !keepOrigin) return;
    setRegionKey(k);
    setOrigin(keepOrigin ?? null);
    setSelectedId(null);
    setShowAll(false);
    setMessage(null);
    setNameFilter(null);
    setOptions(null);
    if (!keepOrigin) setQuery("");
  }

  function locate(auto = false) {
    if (!navigator.geolocation) {
      if (!auto) setMessage(t("c.cf.err.noGeo"));
      return;
    }
    setBusy("locate");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o: Origin = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: t("c.cf.yourLocation") };
        setMyLoc(o);
        setNameFilter(null);
        setOptions(null);
        // Pick the part of the world the visitor is in.
        const here = REGIONS.find((r) => o.lng >= r.bounds[0][0] && o.lng <= r.bounds[1][0] && o.lat >= r.bounds[0][1] && o.lat <= r.bounds[1][1]);
        setQuery("");
        setSelectedId(null);
        setBusy(null);
        if (here && here.key !== regionKey) changeRegion(here.key, o);
        else setOrigin(o);
      },
      (err) => {
        setBusy(null);
        if (!auto) setMessage(err.code === 1 ? t("c.cf.err.blocked") : t("c.cf.err.fail"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cafés (current region) whose name matches `qn` (already normalized), best first; closest first when a position is known.
  function matchCafes(qn: string, minScore: number, from: { lat: number; lng: number } | null): { cafe: Cafe; score: number; dist: number | null }[] {
    const out: { cafe: Cafe; score: number; dist: number | null }[] = [];
    (all ?? []).forEach((cafe, i) => {
      const score = nameScore(qn, normNames[i]);
      if (score >= minScore) out.push({ cafe, score, dist: from ? haversineMiles(from, cafe) : null });
    });
    out.sort((x, y) => (from ? (x.dist ?? 0) - (y.dist ?? 0) : y.score - x.score || x.cafe.name.localeCompare(y.cafe.name)));
    return out;
  }

  const knownPosition = () => myLoc ?? (origin && origin.label === t("c.cf.yourLocation") ? origin : null);

  function goToPlace(o: Origin) {
    const k = regionForCountry(o.country);
    setSelectedId(null);
    setNameFilter(null);
    setOptions(null);
    setSuggOpen(false);
    setQuery(o.label);
    if (k && k !== regionKey) changeRegion(k, o);
    else setOrigin(o);
  }

  // Show the cafés named like `label` (closest to the visitor first) and bring them to the closest one.
  function goToCafes(label: string, hits: { cafe: Cafe; dist: number | null }[], from: Origin | null) {
    setOptions(null);
    setSuggOpen(false);
    setQuery(label);
    setNameFilter({ label, ids: new Set(hits.map((h) => h.cafe.id)) });
    setMessage(from ? null : hits.length > 1 ? t("c.cf.closestHint") : null);
    if (from) setOrigin(from);
    const first = hits[0].cafe;
    window.setTimeout(() => {
      const map = mapRef.current;
      if (hits.length === 1 || from) select(first.id);
      else if (map) {
        const bnd = new mapboxgl.LngLatBounds([first.lng, first.lat], [first.lng, first.lat]);
        for (const h of hits.slice(0, 200)) bnd.extend([h.cafe.lng, h.cafe.lat]);
        map.fitBounds(bnd, { padding: 70, maxZoom: 13, duration: 900 });
      }
    }, 80);
  }

  function pick(o: Opt) {
    if (o.kind === "place") return goToPlace(o.origin);
    const from = knownPosition();
    setNameFilter(null);
    setOptions(null);
    setSuggOpen(false);
    setQuery(o.cafe.name);
    if (from) setOrigin(from);
    select(o.cafe.id);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy("search");
    setMessage(null);
    setOptions(null);
    setSuggOpen(false);
    try {
      const qn = norm(q);
      const from = knownPosition();
      const exact = !/\d/.test(qn) ? matchCafes(qn, 1.2, from) : []; // a café with exactly this name
      const places = await geocodeMany(q, region.countries, lang, 5).then((r) => (r.length ? r : geocodeMany(q, ALL_COUNTRIES, lang, 5)));
      const place = places[0];
      const placeStrong = !!place && (place.relevance ?? 0) >= 0.9;
      if (exact.length) return goToCafes(exact[0].cafe.name, exact, from); // the name of a venue: its closest outlet first
      if (placeStrong) return goToPlace(place); // a city, ZIP or postcode
      const inside = !/\d/.test(qn) && qn.length >= 3 ? matchCafes(qn, 1.0, from) : []; // the text is part of a café name
      if (inside.length) return goToCafes(q, inside, from);
      // Nothing matched well (a typo, probably): offer the closest cafés and places to choose from.
      const fuzzy = qn.length >= 4 ? matchCafes(qn, 0.62, from) : [];
      const seen = new Set<string>();
      const list: Opt[] = [];
      for (const f of fuzzy) {
        const k = norm(f.cafe.name);
        if (seen.has(k)) continue;
        seen.add(k);
        list.push({ kind: "cafe", cafe: f.cafe, dist: f.dist });
        if (list.length >= 4) break;
      }
      for (const p of places.slice(0, 4)) list.push({ kind: "place", origin: p });
      if (!list.length) setMessage(t("c.cf.err.notFound"));
      else setOptions({ q, list });
    } catch {
      setMessage(t("c.cf.err.search"));
    } finally {
      setBusy(null);
    }
  }

  // Live suggestions while typing: cafés whose name contains the text, plus places (debounced).
  useEffect(() => {
    const q = query.trim();
    const qn = norm(q);
    if (qn.length < 2 || !suggOpen) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      const from = knownPosition();
      const seen = new Set<string>();
      const list: Opt[] = [];
      if (!/\d/.test(qn)) {
        for (const h of matchCafes(qn, 1.0, from)) {
          const k = norm(h.cafe.name);
          if (seen.has(k)) continue;
          seen.add(k);
          list.push({ kind: "cafe", cafe: h.cafe, dist: h.dist });
          if (list.length >= 4) break;
        }
      }
      try {
        const places = await geocodeMany(q, region.countries, lang, 4, true);
        for (const p of places) list.push({ kind: "place", origin: p });
      } catch {
        /* suggestions are optional */
      }
      if (live) setSugg(list);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, suggOpen, all]);

  function clearSearch() {
    setOrigin(null);
    setNameFilter(null);
    setOptions(null);
    setQuery("");
    setMessage(null);
    setSelectedId(null);
  }

  const fmtDist = (d: number) => (d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString(INTL_LANG[lang]));
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const fieldClass = "border border-line-strong rounded-sm px-3 py-2.5 bg-paper text-sm text-ink focus:outline-none focus:border-matcha";
  const label = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";
  const unitWord = unit === "mi" ? t("c.cf.unit.miles") : t("c.cf.unit.km");
  const nf = (n: number) => n.toLocaleString(INTL_LANG[lang]);

  return (
    <div>
      <div role="tablist" aria-label={t("c.region.label")} className="mb-4 flex flex-wrap gap-2">
        {REGIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={r.key === regionKey}
            onClick={() => changeRegion(r.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${r.key === regionKey ? "border-matcha bg-matcha text-paper" : "border-line-strong bg-paper-raised text-ink hover:bg-matcha-soft"}`}
          >
            {regionLabel(r.key)}
          </button>
        ))}
      </div>

      <form onSubmit={runSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="cafe-q" className={label}>
            {t("c.cf.searchLabel")}
          </label>
          <div className="relative flex gap-2">
            <input
              id="cafe-q"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggOpen(true);
              }}
              onFocus={() => setSuggOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggOpen(false), 150)}
              onKeyDown={(e) => e.key === "Escape" && setSuggOpen(false)}
              placeholder={t("c.cf.searchPh")}
              autoComplete="off"
              role="combobox"
              aria-expanded={visibleSugg.length > 0}
              aria-controls="cafe-q-list"
              className={`${fieldClass} flex-1 min-w-0`}
            />
            <button type="submit" disabled={busy !== null || !query.trim()} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper hover:bg-forest transition-colors disabled:opacity-50">
              {busy === "search" ? t("c.cf.searching") : t("c.cf.search")}
            </button>
            {visibleSugg.length > 0 && (
              <ul id="cafe-q-list" role="listbox" className="absolute left-0 right-24 top-full z-20 mt-1 overflow-hidden rounded-sm border border-line-strong bg-paper shadow-lg">
                {visibleSugg.map((o, i) => (
                  <li key={i} role="option" aria-selected={false}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)} className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-matcha-soft">
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-ink">{o.kind === "cafe" ? o.cafe.name : o.origin.label}</span>
                        {o.kind === "cafe" && <span className="text-ink-muted"> · {place(o.cafe)}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint">{o.kind === "place" ? t("c.cf.optPlace") : o.dist != null ? `${fmtDist(o.dist * (unit === "km" ? KM_PER_MILE : 1))} ${unit}` : t("c.cf.optCafe")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button type="button" onClick={() => locate()} disabled={busy !== null} className="rounded-sm border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-matcha transition-colors disabled:opacity-50">
          {busy === "locate" ? t("c.cf.locating") : t("c.cf.locate")}
        </button>
        <div>
          <label htmlFor="cafe-radius" className={label}>
            {t("c.cf.within")}
          </label>
          <select id="cafe-radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} disabled={!origin} className={`${fieldClass} w-full lg:w-32 disabled:opacity-50`}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? t("c.cf.anyDistance") : `${r} ${unitWord}`}
              </option>
            ))}
          </select>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-xs text-ink-faint">{t("c.cf.privacy")}</p>
      </div>
      {message && (
        <p className="mt-3 rounded-sm border border-line bg-paper-raised px-3 py-2 text-sm text-ink-muted" role="status">
          {message}
        </p>
      )}
      {options && (
        <div className="mt-3 rounded-sm border border-line bg-paper-raised px-3 py-3 text-sm text-ink-muted" role="status">
          <p>{t("c.cf.didYouMean", { q: options.q })}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {options.list.map((o, i) => (
              <li key={i}>
                <button type="button" onClick={() => pick(o)} className="rounded-full border border-line-strong bg-paper px-3 py-1.5 text-left text-ink hover:border-matcha hover:bg-matcha-soft">
                  <span className="font-medium">{o.kind === "cafe" ? o.cafe.name : o.origin.label}</span>
                  <span className="text-ink-muted">{o.kind === "cafe" ? ` · ${place(o.cafe)}` : ` · ${t("c.cf.optPlace")}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-5">
        <div className="relative h-[360px] lg:h-[680px] rounded-sm overflow-hidden border border-line">
          {token ? <div ref={containerRef} className="h-full w-full" /> : <div className="flex h-full items-center justify-center text-ink-muted">{t("c.cf.noToken")}</div>}
        </div>

        <section aria-label={t("c.cf.listLabel")} className="lg:h-[680px] lg:overflow-y-auto">
          {loadError ? (
            <p className="text-sm text-ink-muted">{t("c.cf.loadError")}</p>
          ) : all === null ? (
            <p className="text-sm text-ink-muted">{t("c.cf.loading")}</p>
          ) : (
            <p className="text-sm text-ink-muted mb-3" aria-live="polite">
              {origin
                ? radius > 0
                  ? t(listed.length === 1 ? "c.cf.withinOf.one" : "c.cf.withinOf.other", { count: nf(listed.length), radius, unit: unitWord, place: origin.label })
                  : t(listed.length === 1 ? "c.cf.nearPlace.one" : "c.cf.nearPlace.other", { count: nf(listed.length), place: origin.label })
                : t("c.cf.listed", { count: nf(listed.length), region: regionLabel(region.key) })}
              {nameFilter && !origin && (
                <button type="button" onClick={clearSearch} className="ml-2 text-matcha hover:text-forest underline">
                  {t("c.cf.clear")}
                </button>
              )}
              {origin && (
                <button type="button" onClick={clearSearch} className="ml-2 text-matcha hover:text-forest underline">
                  {t("c.cf.clear")}
                </button>
              )}
            </p>
          )}

          {origin && all && listed.length === 0 && (
            <div className="rounded-sm border border-line bg-paper-raised p-4 text-sm text-ink-muted">
              <p>{t("c.cf.noneWithin", { radius, unit: unitWord })}</p>
              {nearest && (
                <p className="mt-2">
                  {rich(t("c.cf.nearest", { city: nearest.cafe.city, dist: nf(Math.round(nearest.dist ?? 0)), unit: unitWord }), { name: <strong className="text-ink">{nearest.cafe.name}</strong> })}{" "}
                  <button type="button" onClick={() => setRadius(0)} className="text-matcha hover:text-forest underline">
                    {t("c.cf.showAllDist")}
                  </button>
                </p>
              )}
              <p className="mt-2">{t("c.cf.tellUs")}</p>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {listed.filter((x, i) => showAll || i < LIST_CAP || x.cafe.id === selectedId).map(({ cafe: c, dist }) => (
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
                    {dist != null && (
                      <span className="text-xs tabular-nums text-matcha whitespace-nowrap">
                        {fmtDist(dist)} {unit}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{place(c)}</span>
                </button>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-matcha-soft px-2 py-0.5 text-matcha-ink">{c.reported ? t("c.cf.reported") : c.nameOnly ? t("c.cf.inName") : t("c.cf.onSite")}</span>
                </p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <Link href={`/cafes/${cafeSlug(c)}`} className="font-medium text-matcha hover:text-forest">
                    {t("c.cf.menu")}
                  </Link>
                  <a href={directionsUrl(c)} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                    {t("c.cf.directions")}
                  </a>
                </p>
              </li>
            ))}
          </ul>
          {!showAll && listed.length > LIST_CAP && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm text-matcha hover:text-forest underline text-left">
              {t("c.cf.showAll", { count: nf(listed.length) })}
            </button>
          )}
          {!origin && all && total === 0 && <p className="text-sm text-ink-muted">{t("c.cf.noMatch")}</p>}
        </section>
      </div>

      <p className="mt-6 text-sm text-ink-muted">{t("c.cf.suggest")}</p>
      <SuggestCafe contactEmail={contactEmail} />
    </div>
  );
}
