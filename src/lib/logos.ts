import brandLogos from "./brand-logos.json";

// Real logo files live in public/logos/, sourced from each brand's own
// official site (or, where a brand's site is dead/blocked, an archived
// snapshot of their own real logo -- never a fabricated or substitute
// image). 93 of 100 brands have one on file; the rest genuinely don't
// publish a usable logo asset anywhere findable, so callers should treat
// a null return as "show the brand name as text," not an error.
const manifest: Record<string, string> = brandLogos;

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
  const filename = manifest[slugify(brandName)];
  return filename ? `/logos/${filename}` : null;
}

// A handful of the real logos are white-on-transparent (Hekisuien, Gion
// Tsujiri, Naoki Matcha, Tsujiki, Tsuki Matcha) or white-only-fill SVG
// (Palais des Thés) -- confirmed by sampling opaque pixel color across all
// 93 files, not a guess. Those need a dark backdrop instead of the default
// white chip, or the mark is invisible against it.
const NEEDS_DARK_BACKDROP = new Set([
  "hekisuien",
  "gion-tsujiri",
  "naoki-matcha",
  "tsujiki",
  "tsuki-matcha",
  "palais-des-thes",
]);

export function logoNeedsDarkBackdrop(brandName: string): boolean {
  return NEEDS_DARK_BACKDROP.has(slugify(brandName));
}
