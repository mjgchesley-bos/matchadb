"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// A small, zoomed-in map of the neighbourhood with a green dot on the place (same style as the café finder). Pan and zoom work; scroll-zoom is off so the page still scrolls.
export function MiniMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  useEffect(() => {
    if (!ref.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: ref.current, style: "mapbox://styles/mapbox/light-v11", center: [lng, lat], zoom: 14.2, attributionControl: false, cooperativeGestures: true });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    const dot = document.createElement("div");
    dot.style.cssText = "width:18px;height:18px;border-radius:9999px;background:#6aa84f;border:3px solid #fff6df;box-shadow:0 0 0 2px #2b5a20,0 2px 6px rgba(0,0,0,.3);";
    new mapboxgl.Marker({ element: dot }).setLngLat([lng, lat]).addTo(map);
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      map.remove();
    };
  }, [lat, lng, token]);
  if (!token) return null;
  return <div ref={ref} role="img" aria-label={label} className="h-56 w-full overflow-hidden rounded-sm border border-line-strong sm:h-64" />;
}
