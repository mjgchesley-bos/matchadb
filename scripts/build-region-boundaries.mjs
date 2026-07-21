// One-off: builds public/region-boundaries/*.geojson from real government
// administrative-boundary data, one file per REGION_COORDINATES key. Run
// manually; not part of the normal build (the raw source files are large
// and fetched from external mirrors, not something to re-download on every
// build).
//
// Sources (all real, public, non-fabricated):
//  - Municipality (city/town) boundaries: niiyz/JapanCityGeoJson, itself
//    built from Japan's MLIT National Land Numerical Information (N03)
//    administrative-boundary dataset.
//  - Prefecture boundaries: dataofjapan/land.
//  - Country boundaries: datasets/geo-countries (Natural Earth-derived).
//
// Deliberately NOT included anywhere: farm/property parcel boundaries --
// no public registry publishes land-parcel outlines for private tea farms.
//
// Precision choices, explicit per region:
//  - Uji, Kikugawa, Nishio, Wazuka, Nara, Yame, Miyazaki, Kagoshima: a
//    single real municipality (city/town) boundary.
//  - Kyoto, Shizuoka: the brand disclosures for these say only the city
//    name, but Kyoto-shi/Shizuoka-shi are themselves split into wards in
//    the source data with no single ward covering the whole city -- so
//    all of that city's wards are unioned into one shape.
//  - Shirakawa: a sub-area of Uji, not its own municipality -- reuses the
//    Uji boundary rather than inventing a smaller shape that doesn't
//    correspond to any real administrative unit.
//  - Aichi, Kyushu: "Aichi" is disclosed as a bare prefecture name (unlike
//    "Nishio, Aichi" elsewhere), so it gets the Aichi prefecture boundary.
//    "Kyushu" is a whole multi-prefecture island with no single
//    administrative boundary at all, so it's left without a polygon --
//    drawing one would mean picking an arbitrary constituent prefecture
//    the source never actually named.
//  - China, Korea, Taiwan: already country-level precision in
//    REGION_COORDINATES -- national boundary.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import simplify from "@turf/simplify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scratchBoundaries =
  "C:/Users/mjgch/AppData/Local/Temp/claude/C--Program-Files-Git/bb02e71c-8e12-4751-a3c2-550705c51b75/scratchpad/boundaries";
const scratchRoot =
  "C:/Users/mjgch/AppData/Local/Temp/claude/C--Program-Files-Git/bb02e71c-8e12-4751-a3c2-550705c51b75/scratchpad";
const outDir = path.join(__dirname, "..", "public", "region-boundaries");
fs.mkdirSync(outDir, { recursive: true });

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function toFeature(geometry, name) {
  return { type: "Feature", properties: { name }, geometry };
}

// Merges N MultiPolygon/Polygon geometries into one MultiPolygon by
// concatenating their polygon rings -- valid because a MultiPolygon is
// just an array of Polygon coordinate arrays; no need for a real geometric
// union library when the pieces don't overlap (adjacent wards/prefectures
// never do).
function unionGeometries(geometries) {
  const polygons = [];
  for (const g of geometries) {
    if (g.type === "Polygon") polygons.push(g.coordinates);
    else if (g.type === "MultiPolygon") polygons.push(...g.coordinates);
  }
  return { type: "MultiPolygon", coordinates: polygons };
}

function simplifyAndRound(geometry, tolerance) {
  const feature = toFeature(geometry, "tmp");
  const simplified = simplify(feature, { tolerance, highQuality: true });
  const round = (coords, depth) =>
    depth === 0
      ? [Math.round(coords[0] * 1e5) / 1e5, Math.round(coords[1] * 1e5) / 1e5]
      : coords.map((c) => round(c, depth - 1));
  const depth = simplified.geometry.type === "MultiPolygon" ? 3 : 2;
  return { type: simplified.geometry.type, coordinates: round(simplified.geometry.coordinates, depth) };
}

function writeRegion(key, geometry, tolerance = 0.002) {
  const simplified = simplifyAndRound(geometry, tolerance);
  const feature = toFeature(simplified, key);
  const outPath = path.join(outDir, `${key}.geojson`);
  fs.writeFileSync(outPath, JSON.stringify(feature));
  const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`${key}: ${sizeKb} KB`);
}

// --- Direct single-municipality regions ---
const directMunicipalities = {
  Uji: "uji",
  Kikugawa: "kikugawa", // not a REGION_COORDINATES key itself -- used below for Shirakawa fallback note only if needed
  Nishio: "nishio",
  Wazuka: "wazuka",
  Nara: "nara",
  Yame: "yame",
  Miyazaki: "miyazaki",
  Kagoshima: "kagoshima",
};

for (const [regionKey, fileBase] of Object.entries(directMunicipalities)) {
  if (regionKey === "Kikugawa") continue; // farm-location only, not a region key
  const data = readJson(path.join(scratchBoundaries, `${fileBase}.json`));
  const geometry = data.features ? data.features[0].geometry : data.geometry;
  writeRegion(regionKey, geometry);
}

// Shirakawa is a sub-area of Uji, not its own municipality -- same real
// boundary as Uji, just filed under its own region key so the popup can
// still say "Shirakawa (Uji)".
{
  const data = readJson(path.join(scratchBoundaries, "uji.json"));
  const geometry = data.features ? data.features[0].geometry : data.geometry;
  writeRegion("Shirakawa", geometry);
}

// --- Kyoto-shi: union of its 11 wards ---
{
  const wardCodes = ["26101", "26102", "26103", "26104", "26105", "26106", "26107", "26108", "26109", "26110", "26111"];
  const geometries = wardCodes.map((code) => {
    const data = readJson(path.join(scratchBoundaries, `kyoto-ward-${code}.json`));
    return data.features ? data.features[0].geometry : data.geometry;
  });
  writeRegion("Kyoto", unionGeometries(geometries), 0.003);
}

// --- Shizuoka-shi: union of its 3 wards ---
{
  const wardCodes = ["22101", "22102", "22103"];
  const geometries = wardCodes.map((code) => {
    const data = readJson(path.join(scratchBoundaries, `shizuoka-ward-${code}.json`));
    return data.features ? data.features[0].geometry : data.geometry;
  });
  writeRegion("Shizuoka", unionGeometries(geometries), 0.003);
}

// --- Aichi prefecture (bare prefecture disclosure, not a specific city) ---
{
  const data = readJson(path.join(scratchRoot, "japan.geojson"));
  const feature = data.features.find((f) => f.properties.id === 23);
  writeRegion("Aichi", feature.geometry, 0.004);
}

// --- Countries: China, South Korea, Taiwan ---
{
  const data = readJson(path.join(scratchBoundaries, "countries.geojson"));
  const wanted = { China: "China", Korea: "South Korea", Taiwan: "Taiwan" };
  for (const [regionKey, countryName] of Object.entries(wanted)) {
    const feature = data.features.find((f) => f.properties.name === countryName);
    if (!feature) {
      console.log(`${regionKey}: NOT FOUND (${countryName})`);
      continue;
    }
    writeRegion(regionKey, feature.geometry, 0.01);
  }
}

// --- Provinces: Zhejiang (China), Jeju (South Korea) -- disclosed text
// named these specifically (Numi: "Zhejiang, China"; Grin Mood: "Jeju
// Island, South Korea"), one precision level tighter than the bare
// country pins above. Source: Natural Earth admin-1 states/provinces. ---
{
  const data = readJson(path.join(scratchBoundaries, "admin1.geojson"));
  const wanted = { Zhejiang: "Zhejiang", Jeju: "Jeju" };
  for (const [regionKey, provinceName] of Object.entries(wanted)) {
    const feature = data.features.find((f) => f.properties.name === provinceName);
    if (!feature) {
      console.log(`${regionKey}: NOT FOUND (${provinceName})`);
      continue;
    }
    writeRegion(regionKey, feature.geometry, 0.004);
  }
}

// --- Farm-location context boundaries (not REGION_COORDINATES keys --
// consumed by farms.ts as each farm's nearest known administrative
// boundary, same "closest boundary we can verify" logic as the region
// map, just one precision level tighter since a specific farm is named). ---
{
  const data = readJson(path.join(scratchBoundaries, "hamamatsu-tenryu.json"));
  const geometry = data.features ? data.features[0].geometry : data.geometry;
  writeRegion("farm-isagawa-tenryu", geometry, 0.003);
}
{
  const data = readJson(path.join(scratchBoundaries, "kikugawa.json"));
  const geometry = data.features ? data.features[0].geometry : data.geometry;
  writeRegion("farm-hattori-kikugawa", geometry, 0.003);
}

console.log("Kyushu: intentionally skipped -- multi-prefecture island region, no single administrative boundary exists.");
