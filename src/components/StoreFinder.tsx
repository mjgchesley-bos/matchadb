"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/i18n/Link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { BrandMatchaInfo, Store } from "@/lib/store-types";
import { useLang, useT } from "@/i18n/client";
import { INTL_LANG, localePath, type Locale } from "@/i18n/config";
import { rich } from "@/i18n/rich";
import { usd30 } from "@/lib/unit-price";
import { formatPlace } from "@/lib/cafe-types";
import { ALL_COUNTRIES, REGIONS, regionByKey, regionForCountry, type RegionKey } from "@/lib/cafe-regions";
import { KM_PER_MILE, geocode, haversineMiles, type Origin } from "@/lib/geo";

// Search by ZIP code, postcode or city, or use your device's location, to find stores near
// you that carry brands from the database, in the US, Canada, Europe, Japan and South Korea. Your
// position is only used in your browser to sort and map the list; nothing about it is sent to or
// stored by us. (A typed place is sent to Mapbox's geocoder to turn it into a point.)

type Listed = { store: Store; dist: number | null };

const RADII = [10, 25, 50, 100, 0]; // 0 = any distance
const LIST_CAP = 40;
const fmtDate = (iso: string, lang: Locale) => new Date(iso + "T12:00:00").toLocaleDateString(INTL_LANG[lang], { year: "numeric", month: "short", day: "numeric" });
const directionsUrl = (s: Store, lang: Locale) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.name}, ${formatPlace(s, lang)}`)}`;
const regionOf = (s: Store): RegionKey => regionForCountry(s.cc ?? "US") ?? "us";


// The popup shown over a pin: the place, and for each brand it carries, what that brand's
// matcha is like (grades, product count, price per 30 g) from our product database. Built
// with DOM nodes and textContent so store names from brand locators can never inject markup.
function buildPopup(s: Store, info: Record<string, BrandMatchaInfo>, lang: Locale, t: (key: string, vars?: Record<string, string | number>) => string): HTMLElement {
  const el = (tag: string, cls: string, text?: string) => {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const root = el("div", "store-pop");
  root.appendChild(el("p", "font-display text-base font-semibold text-ink leading-snug", s.name));
  root.appendChild(el("p", "mt-0.5 text-xs text-ink-muted", `${t(`c.st.kind.${s.kind}`)} · ${formatPlace(s, lang)}`));
  const list = el("ul", "mt-2.5 flex flex-col gap-2");
  for (const b of s.brands) {
    const m = info[b.name];
    const li = el("li", "rounded-sm bg-matcha-soft px-2.5 py-2");
    const a = el("a", "text-sm font-medium text-matcha-ink underline underline-offset-2", b.name) as HTMLAnchorElement;
    a.href = localePath(lang, `/brands/${encodeURIComponent(b.name)}`);
    const head = el("p", "text-xs text-ink-muted");
    head.append(`${t(`c.st.verb.${s.kind}`)} `, a);
    li.appendChild(head);
    if (m && m.products > 0) {
      const bits: string[] = [];
      if (m.grades.length) bits.push(t(m.grades.length > 1 ? "c.st.grades.other" : "c.st.grades.one", { list: m.grades.join(", ") }));
      bits.push(t(m.products === 1 ? "c.st.products.one" : "c.st.products.other", { n: m.products }));
      if (m.perGram) bits.push(t("c.st.per30", { price: m.perGram[0] === m.perGram[1] ? usd30(m.perGram[0]) : `${usd30(m.perGram[0])}–${usd30(m.perGram[1])}` }));
      li.appendChild(el("p", "mt-1 text-xs text-ink leading-relaxed", bits.join(" · ")));
    }
    list.appendChild(li);
  }
  root.appendChild(list);
  root.appendChild(el("p", "mt-2 text-[11px] text-ink-faint leading-snug", s.listedBy ? t("c.st.fromLocator", { brand: s.listedBy }) : t("c.st.stockVaries")));
  return root;
}

export function StoreFinder({
  stores,
  brandInfo,
  contactEmail,
  initialBrand = "",
  initialRegion = "us",
}: {
  stores: Store[];
  brandInfo: Record<string, BrandMatchaInfo>;
  contactEmail: string;
  initialBrand?: string;
  initialRegion?: RegionKey;
}) {
  const lang = useLang();
  const t = useT();
  const ts = t as unknown as (key: string, vars?: Record<string, string | number>) => string;
  const regionLabel = (k: RegionKey) => t(`c.region.${k}` as "c.region.us");
  const nf = (n: number) => n.toLocaleString(INTL_LANG[lang]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const [regionKey, setRegionKey] = useState<RegionKey>(initialRegion);
  const region = regionByKey(regionKey);
  const unit = region.unit;
  const unitWord = unit === "mi" ? t("c.cf.unit.miles") : t("c.cf.unit.km");
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [brand, setBrand] = useState(initialBrand);
  const [radius, setRadius] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"search" | "locate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const regionStores = useMemo(() => stores.filter((s) => regionOf(s) === regionKey), [stores, regionKey]);
  const counts = useMemo(() => {
    const m = new Map<RegionKey, number>();
    for (const s of stores) m.set(regionOf(s), (m.get(regionOf(s)) ?? 0) + 1);
    return m;
  }, [stores]);

  const brandOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of regionStores) for (const b of s.brands) m.set(b.name, (m.get(b.name) ?? 0) + 1);
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [regionStores]);

  const { listed, nearest, totalForBrand } = useMemo(() => {
    const factor = unit === "km" ? KM_PER_MILE : 1;
    const matching: Listed[] = regionStores
      .filter((s) => !brand || s.brands.some((b) => b.name === brand))
      .map((store) => ({ store, dist: origin ? haversineMiles(origin, store) * factor : null }));
    if (!origin) {
      matching.sort((a, b) => a.store.state.localeCompare(b.store.state) || a.store.city.localeCompare(b.store.city) || a.store.name.localeCompare(b.store.name));
      return { listed: matching, nearest: null as Listed | null, totalForBrand: matching.length };
    }
    matching.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    const within = radius > 0 ? matching.filter((x) => (x.dist ?? 0) <= radius) : matching;
    return { listed: within, nearest: matching[0] ?? null, totalForBrand: matching.length };
  }, [regionStores, brand, origin, radius, unit]);

  // The features currently on the map, kept in a ref so a late style load can apply them.
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
      if (!f) {
        setSelectedId(null);
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Frame the map: the whole region when there is no search, the area around you after one.
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
    const near = listed.slice(0, 5);
    if (near.length === 0) {
      map.flyTo({ center: [origin.lng, origin.lat], zoom: 8, duration: 900 });
      return;
    }
    const b = new mapboxgl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
    for (const { store } of near) b.extend([store.lng, store.lat]);
    map.fitBounds(b, { padding: 70, maxZoom: 12, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, brand, radius, regionKey]);

  function select(id: string) {
    setSelectedId(id);
    const s = stores.find((x) => x.id === id);
    if (s) mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 800 });
  }

  // The popup follows the selected place: opened by a pin click or a card click, closed by the
  // X, a click on empty map, or a new search clearing the selection.
  useEffect(() => {
    const map = mapRef.current;
    const prev = popupRef.current;
    popupRef.current = null; // cleared first so removing the old popup is not read as a close click
    prev?.remove();
    const s = selectedId ? stores.find((x) => x.id === selectedId) : null;
    if (!map || !s) return;
    const popup = new mapboxgl.Popup({ offset: 14, maxWidth: "300px", closeButton: true, closeOnClick: false, className: "store-popup" })
      .setLngLat([s.lng, s.lat])
      .setDOMContent(buildPopup(s, brandInfo, lang, ts))
      .addTo(map);
    popup.on("close", () => {
      if (popupRef.current === popup) setSelectedId(null);
    });
    popupRef.current = popup;
  }, [selectedId, stores, brandInfo, lang, ts]);

  // Selecting a pin on the map scrolls its card into view.
  useEffect(() => {
    if (selectedId) cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  // Switch to another part of the world (a brand that isn't stocked there is cleared).
  function changeRegion(k: RegionKey, keepOrigin?: Origin) {
    if (k === regionKey && !keepOrigin) return;
    setRegionKey(k);
    setOrigin(keepOrigin ?? null);
    setSelectedId(null);
    setShowAll(false);
    setMessage(null);
    setBrand("");
    if (!keepOrigin) setQuery("");
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy("search");
    setMessage(null);
    try {
      const o = (await geocode(q, region.countries, lang)) ?? (await geocode(q, ALL_COUNTRIES, lang));
      if (!o) setMessage(t("c.cf.err.notFound"));
      else {
        const k = regionForCountry(o.country);
        setSelectedId(null);
        if (k && k !== regionKey) changeRegion(k, o);
        else setOrigin(o);
      }
    } catch {
      setMessage(t("c.cf.err.search"));
    } finally {
      setBusy(null);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage(t("c.cf.err.noGeo"));
      return;
    }
    setBusy("locate");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o: Origin = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: t("c.cf.yourLocation") };
        const here = REGIONS.find((r) => o.lng >= r.bounds[0][0] && o.lng <= r.bounds[1][0] && o.lat >= r.bounds[0][1] && o.lat <= r.bounds[1][1]);
        setQuery("");
        setSelectedId(null);
        setBusy(null);
        if (here && here.key !== regionKey) changeRegion(here.key, o);
        else setOrigin(o);
      },
      (err) => {
        setBusy(null);
        setMessage(err.code === 1 ? t("c.cf.err.blocked") : t("c.cf.err.fail"));
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

  const fmtDist = (d: number) => (d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString(INTL_LANG[lang]));
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const fieldClass = "border border-line-strong rounded-sm px-3 py-2.5 bg-paper text-sm text-ink focus:outline-none focus:border-matcha";

  return (
    <div>
      <div role="tablist" aria-label={t("c.region.label")} className="mb-4 flex flex-wrap gap-2">
        {REGIONS.filter((r) => (counts.get(r.key) ?? 0) > 0 || r.key === regionKey).map((r) => (
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
          <label htmlFor="store-q" className="block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5">
            {t("c.cf.zip")}
          </label>
          <div className="flex gap-2">
            <input id="store-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(`c.region.${region.key}.ph` as "c.region.us.ph")} autoComplete="postal-code" className={`${fieldClass} flex-1 min-w-0`} />
            <button type="submit" disabled={busy !== null || !query.trim()} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper hover:bg-forest transition-colors disabled:opacity-50">
              {busy === "search" ? t("c.cf.searching") : t("c.cf.search")}
            </button>
          </div>
        </div>
        <button type="button" onClick={useMyLocation} disabled={busy !== null} className="rounded-sm border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-matcha transition-colors disabled:opacity-50">
          {busy === "locate" ? t("c.cf.locating") : t("c.cf.locate")}
        </button>
        <div>
          <label htmlFor="store-brand" className="block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5">
            {t("c.st.brandLabel")}
          </label>
          <select id="store-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={`${fieldClass} w-full lg:w-56`}>
            <option value="">{t("c.st.anyBrand")}</option>
            {brandOptions.map(([name, n]) => (
              <option key={name} value={name}>
                {name} ({n})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="store-radius" className="block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5">
            {t("c.cf.within")}
          </label>
          <select id="store-radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} disabled={!origin} className={`${fieldClass} w-full lg:w-32 disabled:opacity-50`}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? t("c.cf.anyDistance") : `${r} ${unitWord}`}
              </option>
            ))}
          </select>
        </div>
      </form>
      <p className="mt-2 text-xs text-ink-faint">{t("c.cf.privacy")}</p>
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
            <div className="flex h-full items-center justify-center text-ink-muted">{t("c.cf.noToken")}</div>
          )}
        </div>

        <section aria-label={t("c.st.listLabel")} className="lg:h-[640px] lg:overflow-y-auto">
          <p className="text-sm text-ink-muted mb-3" aria-live="polite">
            {origin
              ? radius > 0
                ? t(listed.length === 1 ? "c.st.within.one" : "c.st.within.other", { count: nf(listed.length), radius, unit: unitWord, place: origin.label })
                : t(listed.length === 1 ? "c.st.near.one" : "c.st.near.other", { count: nf(listed.length), place: origin.label })
              : brand
                ? t(listed.length === 1 ? "c.st.listedBrand.one" : "c.st.listedBrand.other", { count: nf(listed.length), region: regionLabel(region.key), brand })
                : t(listed.length === 1 ? "c.st.listed.one" : "c.st.listed.other", { count: nf(listed.length), region: regionLabel(region.key) })}
            {origin && (
              <button type="button" onClick={clearSearch} className="ml-2 text-matcha hover:text-forest underline">
                {t("c.cf.clear")}
              </button>
            )}
          </p>

          {origin && listed.length === 0 && (
            <div className="rounded-sm border border-line bg-paper-raised p-4 text-sm text-ink-muted">
              <p>{brand ? t("c.st.noneBrand", { brand, radius, unit: unitWord }) : t("c.st.none", { radius, unit: unitWord })}</p>
              {nearest && (
                <p className="mt-2">
                  {rich(t("c.cf.nearest", { city: nearest.store.city, dist: nf(Math.round(nearest.dist ?? 0)), unit: unitWord }), { name: <strong className="text-ink">{nearest.store.name}</strong> })}{" "}
                  <button type="button" onClick={() => setRadius(0)} className="text-matcha hover:text-forest underline">
                    {t("c.cf.showAllDist")}
                  </button>
                </p>
              )}
              <p className="mt-2">{t("c.st.tellUs")}</p>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {listed.filter((x, i) => showAll || i < LIST_CAP || x.store.id === selectedId).map(({ store: s, dist }) => (
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
                    {dist != null && (
                      <span className="text-xs tabular-nums text-matcha whitespace-nowrap">
                        {fmtDist(dist)} {unit}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{formatPlace(s, lang)}</span>
                </button>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-gold">{ts(`c.st.kind.${s.kind}`)}</span>
                  {s.brands.map((b) => (
                    <Link key={b.name} href={`/brands/${encodeURIComponent(b.name)}`} className="rounded-full border border-line-strong px-2 py-0.5 text-ink-muted hover:border-matcha hover:text-matcha transition-colors">
                      {t("c.st.carries", { brand: b.name })}
                    </Link>
                  ))}
                </p>
                {s.note && <p className="mt-2 text-xs text-ink-faint leading-relaxed">{s.note}</p>}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <a href={directionsUrl(s, lang)} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                    {t("c.cf.directions")}
                  </a>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-matcha hover:text-forest">
                      {t("c.st.website")}
                    </a>
                  )}
                  <a href={s.brands[0]?.evidence ?? s.url} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-ink-muted">
                    {s.listedBy ? t("c.st.locator", { date: fmtDate(s.checked, lang) }) : t("c.st.source", { date: fmtDate(s.checked, lang) })}
                  </a>
                </p>
              </li>
            ))}
          </ul>
          {!showAll && listed.length > LIST_CAP && (
            <button type="button" onClick={() => setShowAll(true)} className="text-sm text-matcha hover:text-forest underline text-left">
              {t("c.st.showAll", { count: nf(listed.length) })}
            </button>
          )}
          {!origin && totalForBrand === 0 && <p className="text-sm text-ink-muted">{t("c.st.noBrand")}</p>}
        </section>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        {t("c.st.suggest")}{" "}
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent("MatchaDB store suggestion")}&body=${encodeURIComponent("Store name:\nAddress:\nWebsite:\nBrands carried (and a link showing it):\n")}`}
          className="text-matcha hover:text-forest underline"
        >
          {t("c.cf.email")}
        </a>
        .
      </p>
    </div>
  );
}
