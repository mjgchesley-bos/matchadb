"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { REGION_COORDINATES } from "@/lib/regions";
import { PLACES } from "@/lib/places";
import type { FarmLocation } from "@/lib/farms";
import type { BrandCount, MapBreakdown } from "@/lib/db";

export type RegionCount = { region: string; count: number };

// One row of the "in view" list under the map: a region or a named district,
// with the brands that source from it.
type ViewEntry = { id: string; name: string; sub: string; count: number; brands: BrandCount[]; kind: "region" | "place"; href: string };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

// Brand list for a popup: every brand, most products first, scrollable, each a
// link to its brand page.
function brandListHtml(brands: BrandCount[]): string {
  if (!brands.length) return "";
  const items = brands
    .map(
      (b) =>
        `<li style="display:flex;justify-content:space-between;gap:12px;"><a href="/brands/${encodeURIComponent(b.brand)}" style="color:#2b5a20;text-decoration:underline;">${escapeHtml(b.brand)}</a><span style="opacity:0.65;">${b.count}</span></li>`
    )
    .join("");
  return `<div style="margin-top:6px;font-size:12px;"><div style="opacity:0.7;margin-bottom:3px;">${brands.length} brand${brands.length === 1 ? "" : "s"}</div><ul style="list-style:none;margin:0;padding:0;max-height:170px;overflow:auto;display:flex;flex-direction:column;gap:2px;">${items}</ul></div>`;
}

// Small count-badge marker, not the primary region shape anymore -- kept
// modest and only mildly size-scaled so it doesn't visually compete with
// the real boundary outline underneath it.
function radiusFor(count: number, maxCount: number): number {
  const min = 9;
  const max = 16;
  const scale = Math.sqrt(count / maxCount);
  return Math.round(min + (max - min) * scale);
}

// Real government administrative-boundary GeoJSON, generated once by
// scripts/build-region-boundaries.mjs and served as static files -- see
// that script for exactly which source each region's shape came from and
// why a few regions (Kyushu) don't have one. Fetched client-side per
// region rather than bundled, since a few (China) run ~100KB.
async function fetchBoundary(region: string): Promise<GeoJSON.Feature | null> {
  try {
    const res = await fetch(`/region-boundaries/${encodeURIComponent(region)}.geojson`);
    if (!res.ok) return null;
    return (await res.json()) as GeoJSON.Feature;
  } catch {
    return null;
  }
}

// isStyleLoaded()/the "load" event both wait for every visible tile to
// finish rendering -- much stricter than what addSource/addLayer actually
// need (just the style spec parsed and set), and unreliable to gate on if
// any tile request is ever slow. "style.load" fires as soon as the style
// itself is ready, which is the real precondition here. map.getStyle()
// itself *throws* (not returns null/undefined) if called before the style
// is loaded, so it can't be used as a speculative "is it ready yet?"
// check -- only the event, with a short timeout backstop in case it was
// somehow already consumed before this listener attached.
function waitForStyle(map: mapboxgl.Map): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 4000);
    map.once("style.load", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

// A town or ward boundary is only a few pixels across at the map's
// default all-of-East-Asia zoom -- the real shape is there, it's just too
// small to read as anything but a dot. Rather than exaggerate it (which
// would misrepresent how big the place actually is), clicking flies the
// camera to the boundary's real extent so the true outline becomes
// visible at a scale where it's actually legible.
function boundsOf(geometry: GeoJSON.Geometry): mapboxgl.LngLatBounds {
  const bounds = new mapboxgl.LngLatBounds();
  function walk(coords: unknown, depth: number) {
    if (depth === 0) {
      bounds.extend(coords as [number, number]);
    } else {
      (coords as unknown[]).forEach((c) => walk(c, depth - 1));
    }
  }
  const depth = geometry.type === "MultiPolygon" ? 3 : geometry.type === "Polygon" ? 2 : 0;
  if ("coordinates" in geometry) walk(geometry.coordinates, depth);
  return bounds;
}

export function SourcingMap({
  regionCounts,
  farmLocations = [],
  breakdown,
}: {
  regionCounts: RegionCount[];
  farmLocations?: FarmLocation[];
  breakdown: MapBreakdown;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [inView, setInView] = useState<{ zoom: number; entries: ViewEntry[] }>({ zoom: 3.2, entries: [] });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [125, 33],
      zoom: 3.2,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    // Mapbox GL measures its container once at construction time. If that
    // happens before the surrounding layout has settled to its final width
    // (web font loading, flex reflow, etc.), the map permanently renders at
    // whatever tiny size it first saw -- a ResizeObserver keeps it in sync
    // with the container's actual size for the lifetime of the component,
    // not just on mount.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    const maxCount = Math.max(...regionCounts.map((r) => r.count));
    let active = true;

    // Region count badges are large; zoomed in close they would sit on top of
    // the district dots they contain (Uji's badge covers Ogura), so they fade
    // out and the districts, labels and boundary shapes take over.
    const badgeEls: HTMLElement[] = [];
    const BADGE_FADE_ZOOM = 10.5;
    function syncBadges() {
      const hidden = map.getZoom() >= BADGE_FADE_ZOOM;
      badgeEls.forEach((el) => {
        // `visibility`, not `opacity`: Mapbox manages a marker's opacity itself and overwrites it.
        el.style.visibility = hidden ? "hidden" : "visible";
      });
    }
    map.on("zoom", syncBadges);

    async function setupRegions() {
      await waitForStyle(map);
      if (!active) return;

      // Whether a shape renders is driven entirely by whether a boundary
      // file actually exists for that region (scripts/build-region-
      // boundaries.mjs), not by precision tier -- both China and Taiwan
      // are country-level precision in the data, but only Taiwan has a
      // file, because outlining a small, specific country like Taiwan is
      // informative while outlining a country the size of China isn't
      // (it just gives "we don't know the sub-region" undeserved visual
      // weight). fetchBoundary already returns null on a 404, so a
      // missing file falls straight through to the point-only badge.
      const fetched = await Promise.all(regionCounts.map(({ region }) => fetchBoundary(region)));
      if (!active) return;
      const boundaryByRegion = new Map(regionCounts.map(({ region }, i) => [region, fetched[i]]));

      regionCounts.forEach(({ region, count }) => {
        const info = REGION_COORDINATES[region];
        if (!info) return;

        const boundary = boundaryByRegion.get(region) ?? null;
        // Mapbox's popup bubble is a hardcoded white background regardless
        // of site theme -- without an explicit dark color here, this text
        // inherits the page's light "ink" color (built for a dark
        // background) and goes invisible against the popup's white one.
        const popupHtml = `<div style="font-family: var(--font-manrope), sans-serif; padding: 2px; color: #1a1a1a;">
             <strong>${info.name}</strong>, ${info.country}<br/>
             ${count} product${count === 1 ? "" : "s"}
             ${brandListHtml(breakdown.regions[region] ?? [])}
             ${
               boundary
                 ? info.precision === "country"
                   ? '<br/><span style="opacity:0.7;font-size:11px;">the whole country, shown because it\'s a small enough place for that to be genuinely informative</span>'
                   : '<br/><span style="opacity:0.7;font-size:11px;">real administrative boundary</span>'
                 : info.precision === "country"
                   ? '<br/><span style="opacity:0.7;font-size:11px;">country-level only -- no more specific location was ever disclosed</span>'
                   : info.precision === "province"
                     ? '<br/><span style="opacity:0.7;font-size:11px;">province-level -- more specific than country, not a single farm</span>'
                     : '<br/><span style="opacity:0.7;font-size:11px;">no single boundary exists for this region -- shown as a point only</span>'
             }
           </div>`;

        if (boundary) {
          const sourceId = `region-${region}`;
          map.addSource(sourceId, { type: "geojson", data: boundary });
          map.addLayer({
            id: `${sourceId}-fill`,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": "#3c7a2a", "fill-opacity": 0.16 },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#3c7a2a", "line-width": 2 },
          });

          const popup = new mapboxgl.Popup({ closeButton: false }).setHTML(popupHtml);
          map.on("mouseenter", `${sourceId}-fill`, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", `${sourceId}-fill`, () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("click", `${sourceId}-fill`, (e) => {
            // A district dot sitting inside this outline gets the click, not the region.
            if (map.getLayer("places-dot") && map.queryRenderedFeatures(e.point, { layers: ["places-dot"] }).length) return;
            popup.setLngLat(e.lngLat).addTo(map);
            // A town-sized region is only a few pixels across at the
            // map's default zoom -- zoom to its real extent so the
            // outline is actually legible, not just theoretically there.
            map.fitBounds(boundsOf(boundary.geometry), { padding: 60, duration: 800 });
          });
        }

        // A small count badge always sits at the region's anchor point --
        // the click target when there's no boundary to click on (Kyushu),
        // and a quick-glance product count either way.
        const el = document.createElement("div");
        const size = radiusFor(count, maxCount) * 2;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "9999px";
        el.style.background = boundary ? "rgba(246, 241, 228, 0.95)" : "rgba(60, 122, 42, 0.30)";
        el.style.border = "2px solid #3c7a2a";
        el.style.cursor = "pointer";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "#222818";
        el.style.fontWeight = "600";
        el.style.fontSize = "10px";
        el.style.fontFamily = "var(--font-manrope), sans-serif";
        el.textContent = String(count);
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${region}: ${count} products`);
        badgeEls.push(el);

        const badgePopup = new mapboxgl.Popup({ offset: size / 2 + 6, closeButton: false }).setHTML(popupHtml);

        new mapboxgl.Marker({ element: el }).setLngLat([info.lng, info.lat]).setPopup(badgePopup).addTo(map);

        el.addEventListener("click", () => {
          window.location.href = `/browse?region=${encodeURIComponent(region)}`;
        });
      });
    }

    setupRegions().then(syncBadges);

    // A second layer: real named farms/gardens, each independently
    // verified against the brand's own page (see src/lib/farms.ts for how
    // these were sourced and why the list is short). Same green as every
    // region shape -- deliberately not a distinct accent color (gold was
    // tried first and dropped: it read as a "premium/quality" signal,
    // which isn't what this represents, just "more precisely located").
    // The diamond shape is the only thing that still sets these apart --
    // shape communicates "different kind of marker" without implying a
    // ranking the way a special color would.
    async function setupFarms() {
      await waitForStyle(map);
      if (!active) return;

      const boundaries = await Promise.all(farmLocations.map((farm) => fetchBoundary(farm.boundaryKey)));
      if (!active) return;

      farmLocations.forEach((farm, i) => {
        const boundary = boundaries[i];
        if (boundary) {
          const sourceId = `farm-${farm.boundaryKey}`;
          map.addSource(sourceId, { type: "geojson", data: boundary });
          map.addLayer({
            id: `${sourceId}-fill`,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": "#3c7a2a", "fill-opacity": 0.16 },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#3c7a2a", "line-width": 2 },
          });
        }

        // Mapbox sets `transform` on the marker's own root element for
        // positioning (translate), which would silently overwrite a
        // rotate() set directly on it -- so the diamond shape has to live
        // on a nested child instead, leaving the root free for Mapbox to
        // position.
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.cursor = "pointer";
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${farm.name}, verified farm location`);

        const diamond = document.createElement("div");
        diamond.style.width = "100%";
        diamond.style.height = "100%";
        diamond.style.transform = "rotate(45deg)";
        diamond.style.background = "#3c7a2a";
        diamond.style.border = "2px solid #fff6df";
        el.appendChild(diamond);

        const productLinks = farm.productIds
          .map((id) => `<a href="/products/${id}" style="color:#2b5a20;text-decoration:underline;">#${id}</a>`)
          .join(", ");

        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
          `<div style="font-family: var(--font-manrope), sans-serif; padding: 2px; max-width: 220px; color: #1a1a1a;">
             <strong>${farm.name}</strong><br/>
             <span style="opacity:0.85;">${farm.brand}</span><br/>
             <span style="font-size:11px;opacity:0.8;">${farm.description}</span><br/>
             <span style="font-size:11px;">Products: ${productLinks}</span><br/>
             <a href="${farm.sourceUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#2b5a20;">
               Verified source &rarr;
             </a>
           </div>`
        );

        new mapboxgl.Marker({ element: el }).setLngLat([farm.lng, farm.lat]).setPopup(popup).addTo(map);

        if (boundary) {
          el.addEventListener("click", () => {
            map.fitBounds(boundsOf(boundary.geometry), { padding: 60, duration: 800 });
          });
        }
      });
    }

    setupFarms();

    // Finer detail than the region level: named districts and towns that brands
    // disclosed (see src/lib/places.ts), plus name labels for every region.
    // Both are symbol layers, so Mapbox decides which names have room to show:
    // zoom in and more of them appear, with no labels piled on top of each other.
    const regionPts = regionCounts.flatMap(({ region, count }) => {
      const info = REGION_COORDINATES[region];
      if (!info) return [];
      const entry: ViewEntry = {
        id: `r-${region}`,
        name: info.name,
        sub: info.country,
        count,
        brands: breakdown.regions[region] ?? [],
        kind: "region",
        href: `/browse?region=${encodeURIComponent(region)}`,
      };
      return [{ lng: info.lng, lat: info.lat, entry }];
    });
    const placePts = breakdown.places.flatMap((bp) => {
      const pl = PLACES.find((p) => p.key === bp.key);
      if (!pl) return [];
      const entry: ViewEntry = { id: `p-${pl.key}`, name: pl.name, sub: pl.area, count: bp.count, brands: bp.brands, kind: "place", href: `/browse?region=${encodeURIComponent(pl.regions[0])}` };
      return [{ lng: pl.lng, lat: pl.lat, entry }];
    });

    function updateView() {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      if (!bounds) return;
      const entries = [...regionPts, ...(zoom >= 6.5 ? placePts : [])]
        .filter((p) => bounds.contains([p.lng, p.lat]))
        .map((p) => p.entry)
        .sort((a, b) => (a.kind === b.kind ? b.count - a.count : a.kind === "region" ? -1 : 1));
      setInView({ zoom, entries });
    }

    async function setupPlaces() {
      await waitForStyle(map);
      if (!active) return;

      map.addSource("region-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: regionPts.map((p) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            properties: { name: p.entry.name, count: p.entry.count },
          })),
        },
      });
      map.addLayer({
        id: "region-labels",
        type: "symbol",
        source: "region-labels",
        minzoom: 4.5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.7],
          "text-anchor": "top",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "symbol-sort-key": ["*", -1, ["get", "count"]],
        },
        paint: { "text-color": "#1f3d17", "text-halo-color": "#fff6df", "text-halo-width": 1.5 },
      });

      map.addSource("places", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: placePts.map((p) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            properties: { id: p.entry.id, name: p.entry.name, count: p.entry.count },
          })),
        },
      });
      map.addLayer({
        id: "places-dot",
        type: "circle",
        source: "places",
        minzoom: 6.5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "count"], 2, 5, 20, 9],
          "circle-color": "#3c7a2a",
          "circle-stroke-color": "#fff6df",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "places-label",
        type: "symbol",
        source: "places",
        minzoom: 7,
        layout: {
          "text-field": ["concat", ["get", "name"], " · ", ["to-string", ["get", "count"]]],
          "text-size": 12,
          "text-offset": [0, 1],
          "text-anchor": "top",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "symbol-sort-key": ["*", -1, ["get", "count"]],
        },
        paint: { "text-color": "#1f3d17", "text-halo-color": "#fff6df", "text-halo-width": 1.5 },
      });

      const placeById = new Map(placePts.map((p) => [p.entry.id, p]));
      map.on("mouseenter", "places-dot", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "places-dot", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "places-dot", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        const p = id ? placeById.get(id) : undefined;
        if (!p) return;
        new mapboxgl.Popup({ closeButton: false, maxWidth: "260px", offset: 10 })
          .setLngLat([p.lng, p.lat])
          .setHTML(
            `<div style="font-family: var(--font-manrope), sans-serif; padding: 2px; color: #1a1a1a;">
               <strong>${escapeHtml(p.entry.name)}</strong>, ${escapeHtml(p.entry.sub)}<br/>
               ${p.entry.count} product${p.entry.count === 1 ? "" : "s"} name this place
               ${brandListHtml(p.entry.brands)}
               <span style="display:block;margin-top:6px;opacity:0.7;font-size:11px;">district or town named by the brand -- not a single farm</span>
             </div>`
          )
          .addTo(map);
      });

      updateView();
    }

    setupPlaces();
    map.on("moveend", updateView);

    return () => {
      active = false;
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [regionCounts, farmLocations, breakdown]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div className="border border-line rounded-sm p-8 text-center text-ink-muted">
        Map token not configured.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="w-full h-[520px] rounded-sm overflow-hidden border border-line" />

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-muted" aria-label="Map legend">
        <li className="flex items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-matcha bg-paper-raised px-1 text-[10px] font-semibold text-ink">12</span>
          Region, with its product count
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-paper-raised bg-matcha ring-1 ring-matcha" />
          District or town a brand named (appears as you zoom in)
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rotate-45 border-2 border-paper-raised bg-matcha ring-1 ring-matcha" />
          Verified single farm
        </li>
      </ul>

      <section aria-label="Brands in the current view" className="border border-line rounded-sm bg-paper-raised">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-forest">Brands in view</h2>
          <p className="text-xs text-ink-faint mt-1">
            {inView.zoom < 6.5
              ? "Zoom in to see the districts and towns brands name, or click any region for its full brand list."
              : "Showing every region and named district inside the map. Pan or zoom and this list follows."}
          </p>
        </div>
        {inView.entries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink-muted">Nothing sourced from this part of the map yet. Zoom out, or drag toward Japan.</p>
        ) : (
          <ul className="divide-y divide-line max-h-[420px] overflow-y-auto">
            {inView.entries.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-ink-faint">
                      {", "}
                      {e.sub}
                      {e.kind === "place" ? " · district named by brands" : ""}
                    </span>
                  </p>
                  <Link href={e.href} className="text-xs text-matcha hover:text-forest transition-colors tabular-nums">
                    {e.count} product{e.count === 1 ? "" : "s"} &rarr;
                  </Link>
                </div>
                <p className="mt-1.5 flex flex-wrap gap-x-1 gap-y-1 text-sm">
                  {e.brands.slice(0, 12).map((b) => (
                    <Link
                      key={b.brand}
                      href={`/brands/${encodeURIComponent(b.brand)}`}
                      className="rounded-full border border-line-strong px-2.5 py-0.5 text-ink-muted hover:border-matcha hover:text-matcha transition-colors"
                    >
                      {b.brand}
                      <span className="ml-1 text-ink-faint tabular-nums">{b.count}</span>
                    </Link>
                  ))}
                  {e.brands.length > 12 && <span className="px-1 py-0.5 text-xs text-ink-faint">+{e.brands.length - 12} more brands</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-ink-faint">
        Green outlines are real administrative boundaries -- towns and provinces where a brand's own
        disclosure (or another verified source) named one, plus a couple of countries small enough
        that outlining the whole nation is still genuinely informative (Taiwan). Regions that never get
        more specific than a country the size of China, or span multiple prefectures with no single
        administrative boundary at all, show only a small point badge instead -- an outline there would
        overstate how precisely the sourcing is actually known. Click a shape (or its count badge) to
        see its brands and products. Zoom in and smaller dots appear for the districts and towns brands
        named on at least two products (Ogura, Kirishima, Hoshino and others); click one for the
        brands behind it. Those are places a brand named, not farm locations, and the list under the
        map follows whatever part of the map you are looking at. Diamond markers are specific named farms we independently
        verified beyond the region level; click one for its source and the exact products it supplies.
        No farm property boundaries are shown anywhere -- there's no public registry of land-parcel
        outlines for private tea farms --{" "}
        <Link href="/browse" className="text-matcha hover:text-forest transition-colors">
          browse all products
        </Link>{" "}
        for full detail.
      </p>
    </div>
  );
}
