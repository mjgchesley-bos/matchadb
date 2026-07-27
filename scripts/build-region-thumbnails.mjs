// One-off: generates a small static map image per sourcing region (not per
// product -- ~18 distinct regions cover all 714 products) via the Mapbox
// Static Images API, so the product page can show "where this matcha comes
// from" without loading the full interactive Mapbox GL JS bundle on every
// one of 714 pages. Re-run manually if REGION_COORDINATES in
// src/lib/regions.ts changes. Requires NEXT_PUBLIC_MAPBOX_TOKEN in
// .env.local (same token the interactive /map page already uses).
//
// Where a real boundary file exists (public/region-boundaries/*.geojson,
// built by build-region-boundaries.mjs), the thumbnail shows that actual
// shape, re-simplified more aggressively than the interactive map's copy
// since a small static thumbnail doesn't need anywhere near as much
// coordinate precision, and the Static Images API has a real URL-length
// ceiling. Where no boundary file exists (Kyushu, Korea, China -- see
// build-region-boundaries.mjs for why), falls back to a marker pin at a
// fixed zoom keyed to the region's precision tier -- still real,
// disclosed-coordinate data, just without a shaded outline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import simplify from "@turf/simplify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!TOKEN) throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN not set in .env.local");

const boundariesDir = path.join(__dirname, "..", "public", "region-boundaries");
const outDir = path.join(__dirname, "..", "public", "region-thumbnails");
fs.mkdirSync(outDir, { recursive: true });

// Mirrors REGION_COORDINATES in src/lib/regions.ts -- kept as a separate
// literal here rather than imported, same convention as
// build-region-boundaries.mjs (plain .mjs build scripts in this project
// don't import the Next app's TS modules).
const REGIONS = {
  Uji: { lat: 34.8845, lng: 135.7997, precision: "town" },
  Kyoto: { lat: 35.0116, lng: 135.7681, precision: "town" },
  Kagoshima: { lat: 31.5966, lng: 130.5571, precision: "town" },
  Shizuoka: { lat: 34.9756, lng: 138.3827, precision: "town" },
  Nishio: { lat: 34.8564, lng: 137.0466, precision: "town" },
  Yame: { lat: 33.2038, lng: 130.5586, precision: "town" },
  Wazuka: { lat: 34.7967, lng: 135.9328, precision: "town" },
  Shirakawa: { lat: 34.8725, lng: 135.8167, precision: "town" },
  Nara: { lat: 34.6851, lng: 135.8048, precision: "town" },
  Aichi: { lat: 35.1802, lng: 136.9066, precision: "town" },
  Kyushu: { lat: 32.7503, lng: 130.75, precision: "town" },
  Sonogi: { lat: 33.0369, lng: 129.9172, precision: "town" },
  Miyazaki: { lat: 31.9111, lng: 131.4239, precision: "town" },
  Zhejiang: { lat: 30.2937, lng: 120.1614, precision: "province" },
  Jeju: { lat: 33.5097, lng: 126.5219, precision: "province" },
  China: { lat: 30.2741, lng: 120.1551, precision: "country" },
  Korea: { lat: 35.0667, lng: 127.75, precision: "country" },
  Taiwan: { lat: 23.912, lng: 120.686, precision: "country" },
};

const ZOOM_BY_PRECISION = { town: 9, province: 5.5, country: 3.5 };
const WIDTH = 480;
const HEIGHT = 300;
const MAX_URL_LENGTH = 7800; // Mapbox's real ceiling is 8192; leave headroom

function walkBounds(coords, depth, bounds) {
  if (depth === 0) {
    const [lng, lat] = coords;
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
  } else {
    coords.forEach((c) => walkBounds(c, depth - 1, bounds));
  }
}

function boundsOf(geometry) {
  const bounds = { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity };
  const depth = geometry.type === "MultiPolygon" ? 3 : 2;
  walkBounds(geometry.coordinates, depth, bounds);
  return bounds;
}

async function fetchAndSave(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox Static API request failed (${res.status}): ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

for (const [key, info] of Object.entries(REGIONS)) {
  const marker = `pin-s+8fe356(${info.lng},${info.lat})`;
  const boundaryPath = path.join(boundariesDir, `${key}.geojson`);
  let overlay = marker;
  let position = `${info.lng},${info.lat},${ZOOM_BY_PRECISION[info.precision]},0`;
  let usedBoundary = false;

  if (fs.existsSync(boundaryPath)) {
    const feature = JSON.parse(fs.readFileSync(boundaryPath, "utf8"));
    // Aggressively re-simplified from the interactive map's own copy -- a
    // 480x300 thumbnail can't show detail the source file has anyway, and
    // the Static Images API bakes the overlay into the URL itself, which
    // has a real length ceiling unlike a browser-side GeoJSON source.
    for (const tolerance of [0.01, 0.02, 0.04, 0.08]) {
      const simplified = simplify(feature, { tolerance, highQuality: false });
      // simplestyle-spec properties the Static Images API reads directly
      // off a GeoJSON Feature -- matches the site's matcha-green accent
      // instead of the default neutral fill.
      const styledFeature = {
        type: "Feature",
        properties: { stroke: "#8fe356", "stroke-width": 2, "stroke-opacity": 0.9, fill: "#8fe356", "fill-opacity": 0.25 },
        geometry: simplified.geometry,
      };
      const geojsonParam = encodeURIComponent(JSON.stringify(styledFeature));
      const candidateOverlay = `geojson(${geojsonParam})`;
      const bounds = boundsOf(simplified.geometry);
      const padLng = (bounds.maxLng - bounds.minLng) * 0.15 || 0.05;
      const padLat = (bounds.maxLat - bounds.minLat) * 0.15 || 0.05;
      const candidatePosition = `[${bounds.minLng - padLng},${bounds.minLat - padLat},${bounds.maxLng + padLng},${bounds.maxLat + padLat}]`;
      const candidateUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${candidateOverlay},${marker}/${candidatePosition}/${WIDTH}x${HEIGHT}@2x?access_token=${TOKEN}`;
      if (candidateUrl.length < MAX_URL_LENGTH) {
        overlay = `${candidateOverlay},${marker}`;
        position = candidatePosition;
        usedBoundary = true;
        break;
      }
    }
  }

  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlay}/${position}/${WIDTH}x${HEIGHT}@2x?access_token=${TOKEN}`;
  const outPath = path.join(outDir, `${key}.png`);
  try {
    const bytes = await fetchAndSave(url, outPath);
    console.log(`${key}: ${usedBoundary ? "boundary+marker" : "marker only"} (${(bytes / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`${key}: FAILED -- ${err.message}`);
  }
}
