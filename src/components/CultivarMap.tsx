"use client";

import { useEffect, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";

// Where one cultivar is grown: a pin for each growing region that brands name on their pages for products of this cultivar. Sized by how many
// products. Like the sourcing map, it shows where the leaf is grown, never where a company is based. Loaded only when the page is opened.
export type CultivarPin = { name: string; sub: string; lat: number; lng: number; count: number; href: string | null };

export function CultivarMap({ pins, label, one, many, openLabel }: { pins: CultivarPin[]; label: string; one: string; many: string; openLabel: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const productsLabel = (n: number) => (n === 1 ? one : many).replace("{n}", String(n));

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const el = box.current;
    if (!el || !token || pins.length === 0) return;
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !box.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({ container: el, style: "mapbox://styles/mapbox/light-v11", center: [pins[0].lng, pins[0].lat], zoom: 5, minZoom: 2, attributionControl: true, cooperativeGestures: true });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      const max = Math.max(...pins.map((p) => p.count));
      const bounds = new mapboxgl.LngLatBounds();
      for (const p of pins) {
        const size = 22 + Math.round((p.count / max) * 26);
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `${p.name}: ${productsLabel(p.count)}`);
        dot.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;background:#3f7d3a;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font:600 12px system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;`;
        dot.textContent = String(p.count);
        const popup = new mapboxgl.Popup({ offset: size / 2 + 4, closeButton: false, maxWidth: "220px" });
        const html = document.createElement("div");
        html.style.cssText = "font:14px system-ui,sans-serif;color:#2b2118;";
        const b = document.createElement("strong");
        b.textContent = p.name;
        const s = document.createElement("div");
        s.style.cssText = "color:#6b6455;font-size:12px;";
        s.textContent = p.sub;
        const n = document.createElement("div");
        n.textContent = productsLabel(p.count);
        html.append(b, s, n);
        if (p.href) {
          const a = document.createElement("a");
          a.href = p.href;
          a.textContent = openLabel;
          a.style.cssText = "color:#3f7d3a;text-decoration:underline;font-size:13px;";
          html.append(a);
        }
        popup.setDOMContent(html);
        new mapboxgl.Marker({ element: dot }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
        bounds.extend([p.lng, p.lat]);
      }
      if (pins.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 7, duration: 0 });
      else map.setZoom(7);
      cleanup = () => map.remove();
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, one, many]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return null;
  return <div ref={box} role="img" aria-label={label} className="h-80 w-full overflow-hidden rounded-sm border border-line bg-paper-raised sm:h-96" />;
}
