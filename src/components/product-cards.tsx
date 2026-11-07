import { getBrandLogoPath, getBrandLogoRatio, logoNeedsInvert } from "@/lib/logos";

// A brand logo chip sized by HEIGHT, not a forced square -- real logos are
// mostly wide wordmarks (checked actual pixel dimensions across all 93
// files: most run 3:1 to 11:1 width:height), and squeezing a 6:1 wordmark
// into a square box via object-contain shrinks it to a few px tall,
// unreadable. The container's width is computed here from the logo's own
// baked-in ratio (scripts/compute-logo-ratios.mjs) and clamped between a
// floor (so a tall/narrow vertical wordmark isn't a sliver) and a cap (so
// an 11:1 wordmark doesn't blow out the layout) -- both container
// dimensions end up as concrete numbers, so the <img> can just fill them
// with object-fit: contain. Deliberately not CSS width:auto/height:auto:
// that's underdetermined for an SVG with only a viewBox and no explicit
// width/height attribute, which is what rendered Ippodo's logo as a
// near-invisible sliver.
// Every chip uses the same plain white background. A handful of logos are
// pure white-on-transparent artwork (confirmed monochrome, not guessed --
// see logoNeedsInvert), which would vanish on white, so those get
// `filter: invert()` to flip them black instead of a one-off dark
// backdrop -- keeps every brand tile visually consistent.
export function BrandLogo({
  brandName,
  size = 28,
  maxWidth,
  allowTallerThanSize = false,
  plain = false,
  logoAlt,
}: {
  brandName: string;
  size?: number;
  // Overrides the default cap of size * 4 -- needed anywhere the logo sits
  // in a fixed-width column (a grid tile) rather than a free-flowing flex
  // row, so a wide wordmark can't overflow its container.
  maxWidth?: number;
  // A genuinely narrow/portrait logo (ratio < 1 -- e.g. Gion Tsujiri's
  // vertical wordmark, ratio 0.184) used to render at a fixed height with
  // width floored at size*0.5: the BOX stopped being a sliver, but the
  // actual image inside it (object-fit: contain preserves the real ratio
  // regardless of box width) still rendered just as thin as ever, now
  // centered in extra dead space -- looked "tiny" even though technically
  // full-height. The real fix is letting the box grow TALLER so a narrow
  // logo can scale up at all. Only safe where the logo has its own
  // dedicated space (a hero panel, a brand-page header, a showcase tile) --
  // never where it sits inline next to text at a fixed row height (the
  // ProductCard/TieredPickCard chips), which is why this defaults to off.
  allowTallerThanSize?: boolean;
  // Drops the white chip and border so the logo sits directly on the page. A logo file with a baked-in
  // white background still blends into the cream page (multiply), instead of showing a white box.
  plain?: boolean;
  // Translated alt text (defaults to English).
  logoAlt?: string;
}) {
  const src = getBrandLogoPath(brandName);
  if (!src) return null;
  const invert = logoNeedsInvert(brandName);
  const ratio = getBrandLogoRatio(brandName);
  const cap = maxWidth ?? size * 4;
  let width: number;
  let height: number;
  if (allowTallerThanSize && ratio < 1) {
    width = Math.max(Math.min(size, cap), size * 0.5);
    height = Math.round(width / ratio);
    const maxHeight = size * 2.5;
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * ratio);
    }
  } else {
    height = size;
    width = Math.round(Math.min(Math.max(size * ratio, size * 0.5), cap));
  }
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${plain ? "" : "rounded-sm border border-line-strong/40 bg-white"}`}
      style={{ height, width, color: "#1a1a1a" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local static
          file, no optimization to gain; plain img lets the container
          control sizing directly instead of Next Image's required fixed
          width/height */}
      <img
        src={src}
        alt={logoAlt ?? `${brandName} logo`}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          padding: 2,
          filter: invert ? "invert(1)" : undefined,
          mixBlendMode: plain ? "multiply" : undefined,
        }}
      />
    </span>
  );
}

// Usucha/koicha are preparation styles (thin vs. thick tea), not
// self-explanatory the way "Ceremonial"/"Culinary" are -- a short
// parenthetical saves someone a trip to a glossary.
export function gradeLabel(grade: string, tv?: (group: string, value: string) => string): string {
  if (tv) return tv("gradeLabel", grade);
  if (grade === "Usucha") return "Usucha (standard)";
  if (grade === "Koicha") return "Koicha (thick)";
  return grade;
}
