import brandLogos from "./brand-logos.json";

// Real logo files live in public/logos/, sourced from each brand's own
// official site (or, where a brand's site is dead/blocked, an archived
// snapshot of their own real logo -- never a fabricated or substitute
// image). 95 of 100 brands have one on file; the rest genuinely don't
// publish a usable logo asset anywhere findable, so callers should treat
// a null return as "show the brand name as text," not an error.
// `ratio` (width/height) is baked in by scripts/compute-logo-ratios.mjs --
// most logos are wide wordmarks (3:1 to 11:1), not square icons, and
// letting a fixed-height CSS box size itself via width:auto/height:auto
// is underdetermined for SVGs with no explicit width/height attribute
// (only a viewBox), which rendered at least one logo (Ippodo) as a
// near-invisible sliver. A known ratio lets the container use CSS
// `aspect-ratio` instead, which is unambiguous.
type LogoEntry = { file: string; ratio: number };
const manifest: Record<string, LogoEntry> = brandLogos;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBrandLogoPath(brandName: string): string | null {
  const entry = manifest[slugify(brandName)];
  return entry ? `/logos/${entry.file}` : null;
}

export function getBrandLogoRatio(brandName: string): number {
  const entry = manifest[slugify(brandName)];
  return entry ? entry.ratio : 1;
}

// A handful of the real logos are pure white-on-transparent (Hekisuien,
// Gion Tsujiri, Naoki Matcha, Tsujiki, Tsuki Matcha) or a white-only-fill
// SVG (Palais des Thés) -- confirmed via research/logo-classification.json,
// which sampled every opaque pixel across all 93 files: each of these six
// is 100% near-white (avg luminance 255) or an SVG with only a "white"
// fill, no color. Since they're monochrome white, `filter: invert()` turns
// them solid black with no color-shift risk, which lets them sit on the
// same white chip as every other logo instead of standing out with a
// one-off dark backdrop.
const NEEDS_INVERT = new Set([
  "hekisuien",
  "gion-tsujiri",
  "naoki-matcha",
  "tsujiki",
  "tsuki-matcha",
  "palais-des-thes",
]);

export function logoNeedsInvert(brandName: string): boolean {
  return NEEDS_INVERT.has(slugify(brandName));
}
