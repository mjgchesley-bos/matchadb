"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { REGION_COORDINATES } from "@/lib/regions";
import type { FarmLocation } from "@/lib/farms";

export type RegionCount = { region: string; count: number };

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

export function SourcingMap({
  regionCounts,
  farmLocations = [],
}: {
  regionCounts: RegionCount[];
  farmLocations?: FarmLocation[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
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

    async function setupRegions() {
      await waitForStyle(map);
      if (!active) return;

      // Country-level regions never get a boundary fetched at all --
      // outlining an entire nation doesn't add precision, it just gives a
      // "we don't actually know the sub-region" fact undeserved visual
      // weight (China's own outline is the country border; that's not a
      // helpful shape for "somewhere in this country"). Point marker only.
      const regionsNeedingBoundary = regionCounts.filter(({ region }) => {
        const info = REGION_COORDINATES[region];
        return info && info.precision !== "country";
      });
      const fetched = await Promise.all(regionsNeedingBoundary.map(({ region }) => fetchBoundary(region)));
      if (!active) return;
      const boundaryByRegion = new Map(regionsNeedingBoundary.map(({ region }, i) => [region, fetched[i]]));

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
             ${
               info.precision === "country"
                 ? '<br/><span style="opacity:0.7;font-size:11px;">country-level only -- no more specific location was ever disclosed</span>'
                 : info.precision === "province"
                   ? '<br/><span style="opacity:0.7;font-size:11px;">province-level -- more specific than country, not a single farm</span>'
                   : boundary
                     ? '<br/><span style="opacity:0.7;font-size:11px;">real administrative boundary</span>'
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
            paint: { "fill-color": "#8fe356", "fill-opacity": 0.12 },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#8fe356", "line-width": 2 },
          });

          const popup = new mapboxgl.Popup({ closeButton: false }).setHTML(popupHtml);
          map.on("mouseenter", `${sourceId}-fill`, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", `${sourceId}-fill`, () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("click", `${sourceId}-fill`, (e) => {
            popup.setLngLat(e.lngLat).addTo(map);
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
        el.style.background = boundary ? "rgba(20, 22, 15, 0.85)" : "rgba(143, 227, 86, 0.35)";
        el.style.border = "2px solid #8fe356";
        el.style.cursor = "pointer";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "#f1ede0";
        el.style.fontWeight = "600";
        el.style.fontSize = "10px";
        el.style.fontFamily = "var(--font-manrope), sans-serif";
        el.textContent = String(count);
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${region}: ${count} products`);

        const badgePopup = new mapboxgl.Popup({ offset: size / 2 + 6, closeButton: false }).setHTML(popupHtml);

        new mapboxgl.Marker({ element: el }).setLngLat([info.lng, info.lat]).setPopup(badgePopup).addTo(map);

        el.addEventListener("click", () => {
          window.location.href = `/browse?region=${encodeURIComponent(region)}`;
        });
      });
    }

    setupRegions();

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
            paint: { "fill-color": "#8fe356", "fill-opacity": 0.12 },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#8fe356", "line-width": 2 },
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
        diamond.style.background = "#8fe356";
        diamond.style.border = "2px solid #fff6df";
        el.appendChild(diamond);

        const productLinks = farm.productIds
          .map((id) => `<a href="/products/${id}" style="color:#8fe356;text-decoration:underline;">#${id}</a>`)
          .join(", ");

        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
          `<div style="font-family: var(--font-manrope), sans-serif; padding: 2px; max-width: 220px; color: #1a1a1a;">
             <strong>${farm.name}</strong><br/>
             <span style="opacity:0.85;">${farm.brand}</span><br/>
             <span style="font-size:11px;opacity:0.8;">${farm.description}</span><br/>
             <span style="font-size:11px;">Products: ${productLinks}</span><br/>
             <a href="${farm.sourceUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#8fe356;">
               Verified source &rarr;
             </a>
           </div>`
        );

        new mapboxgl.Marker({ element: el }).setLngLat([farm.lng, farm.lat]).setPopup(popup).addTo(map);
      });
    }

    setupFarms();

    return () => {
      active = false;
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [regionCounts, farmLocations]);

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
      <p className="text-xs text-ink-faint">
        Green outlines are real administrative boundaries -- shown for towns and provinces, where a
        brand's own disclosure (or another verified source) named one. A handful of regions never get
        more specific than a bare country, or span multiple prefectures with no single administrative
        boundary at all -- those show only a small point badge rather than an outline that would
        overstate how precisely the sourcing is actually known. Click a shape (or its count badge) to
        see products from that region. Diamond markers are specific named farms we independently
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
