"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { REGION_COORDINATES } from "@/lib/regions";

export type RegionCount = { region: string; count: number };

// Marker radius scales with product count so Uji (271 products) reads as
// clearly dominant next to Miyazaki (1 product) rather than same-size dots.
function radiusFor(count: number, maxCount: number): number {
  const min = 8;
  const max = 34;
  const scale = Math.sqrt(count / maxCount);
  return Math.round(min + (max - min) * scale);
}

export function SourcingMap({ regionCounts }: { regionCounts: RegionCount[] }) {
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

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [regionCounts]);

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
        Marker size reflects product count. Click a marker to see products from that region.
        Regions marked "approximate" reflect country-level sourcing data only --{" "}
        <Link href="/browse" className="text-matcha hover:text-forest transition-colors">
          browse all products
        </Link>{" "}
        for full detail.
      </p>
    </div>
  );
}
