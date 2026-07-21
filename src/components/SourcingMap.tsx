"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { REGION_COORDINATES } from "@/lib/regions";
import type { FarmLocation } from "@/lib/farms";

export type RegionCount = { region: string; count: number };

// Marker radius scales with product count so Uji (271 products) reads as
// clearly dominant next to Miyazaki (1 product) rather than same-size dots.
function radiusFor(count: number, maxCount: number): number {
  const min = 8;
  const max = 34;
  const scale = Math.sqrt(count / maxCount);
  return Math.round(min + (max - min) * scale);
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

    for (const { region, count } of regionCounts) {
      const info = REGION_COORDINATES[region];
      if (!info) continue;

      const el = document.createElement("div");
      const size = radiusFor(count, maxCount) * 2;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "9999px";
      el.style.background = "rgba(143, 227, 86, 0.35)";
      el.style.border = "2px solid #8fe356";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = "#14160f";
      el.style.fontWeight = "600";
      el.style.fontSize = "11px";
      el.style.fontFamily = "var(--font-manrope), sans-serif";
      el.textContent = String(count);
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${region}: ${count} products`);

      const popup = new mapboxgl.Popup({ offset: size / 2 + 6, closeButton: false }).setHTML(
        `<div style="font-family: var(--font-manrope), sans-serif; padding: 2px;">
           <strong>${info.name}</strong>, ${info.country}<br/>
           ${count} product${count === 1 ? "" : "s"}
           ${info.precision === "country" ? '<br/><span style="opacity:0.7;font-size:11px;">approximate -- country-level only</span>' : ""}
         </div>`
      );

      new mapboxgl.Marker({ element: el })
        .setLngLat([info.lng, info.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("click", () => {
        window.location.href = `/browse?region=${encodeURIComponent(region)}`;
      });
    }

    // A second, visually distinct layer: real named farms/gardens, each
    // independently verified against the brand's own page (see
    // src/lib/farms.ts for how these were sourced and why the list is
    // short) -- a solid gold diamond rather than the green region circles,
    // so it reads as "we confirmed this exact place" rather than "this is
    // just the city the brand mentioned."
    for (const farm of farmLocations) {
      // Mapbox sets `transform` on the marker's own root element for
      // positioning (translate), which would silently overwrite a rotate()
      // set directly on it -- so the diamond shape has to live on a nested
      // child instead, leaving the root free for Mapbox to position.
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
      diamond.style.background = "#e0b23c";
      diamond.style.border = "2px solid #fff6df";
      el.appendChild(diamond);

      const productLinks = farm.productIds
        .map((id) => `<a href="/products/${id}" style="color:#8fe356;text-decoration:underline;">#${id}</a>`)
        .join(", ");

      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
        `<div style="font-family: var(--font-manrope), sans-serif; padding: 2px; max-width: 220px;">
           <strong>${farm.name}</strong><br/>
           <span style="opacity:0.85;">${farm.brand}</span><br/>
           <span style="font-size:11px;opacity:0.8;">${farm.description}</span><br/>
           <span style="font-size:11px;">Products: ${productLinks}</span><br/>
           <a href="${farm.sourceUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#e0b23c;">
             Verified source &rarr;
           </a>
         </div>`
      );

      new mapboxgl.Marker({ element: el })
        .setLngLat([farm.lng, farm.lat])
        .setPopup(popup)
        .addTo(map);
    }

    return () => {
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
        Green circles are city/prefecture-level regions -- size reflects product count, click to see
        products from that region. Gold diamonds are specific named farms we independently verified;
        click one for its source and the exact products it supplies. Regions marked "approximate"
        reflect country-level sourcing data only --{" "}
        <Link href="/browse" className="text-matcha hover:text-forest transition-colors">
          browse all products
        </Link>{" "}
        for full detail.
      </p>
    </div>
  );
}
