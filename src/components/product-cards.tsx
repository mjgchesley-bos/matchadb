import Link from "next/link";
import type { ProductRow } from "@/lib/db";
import { formatPrice } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
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
}: {
  brandName: string;
  size?: number;
  // Overrides the default cap of size * 4 -- needed anywhere the logo sits
  // in a fixed-width column (a grid tile) rather than a free-flowing flex
  // row, so a wide wordmark can't overflow its container.
  maxWidth?: number;
}) {
  const src = getBrandLogoPath(brandName);
  if (!src) return null;
  const invert = logoNeedsInvert(brandName);
  const ratio = getBrandLogoRatio(brandName);
  const cap = maxWidth ?? size * 4;
  const width = Math.round(Math.min(Math.max(size * ratio, size * 0.5), cap));
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm shrink-0 border border-line-strong/40 bg-white"
      style={{ height: size, width, color: "#1a1a1a" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local static
          file, no optimization to gain; plain img lets the container
          control sizing directly instead of Next Image's required fixed
          width/height */}
      <img
        src={src}
        alt={`${brandName} logo`}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          padding: 2,
          filter: invert ? "invert(1)" : undefined,
        }}
      />
    </span>
  );
}

// Usucha/koicha are preparation styles (thin vs. thick tea), not
// self-explanatory the way "Ceremonial"/"Culinary" are -- a short
// parenthetical saves someone a trip to a glossary.
export function gradeLabel(grade: string): string {
  if (grade === "Usucha") return "Usucha (standard)";
  if (grade === "Koicha") return "Koicha (thick)";
  return grade;
}

export function ProductCard({ product: p }: { product: ProductRow }) {
  const link = getExternalLinkInfo(p.source_url);
  return (
    <div className="border border-line rounded-sm p-4 hover:border-matcha bg-paper-raised hover:bg-matcha-soft transition-colors flex flex-col gap-1">
      <Link href={`/products/${p.id}`} className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <BrandLogo brandName={p.brand_name} />
          <span className="text-base font-bold text-ink">{p.brand_name}</span>
        </span>
        <span className="text-sm text-ink-muted leading-snug">{p.product_name}</span>
        {link && <span className="text-xs text-ink-faint truncate">{link.hostname}</span>}
        <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
          {p.grade && (
            <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">{p.grade}</span>
          )}
          {p.region && (
            <span className="rounded-full bg-paper-raised border border-line text-ink-muted px-2 py-0.5">
              {p.region}
            </span>
          )}
          {p.organic_certified === 1 && (
            <span className="rounded-full bg-gold-soft text-gold px-2 py-0.5">Organic</span>
          )}
          {(JSON.parse(p.flavor_tags) as string[]).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-paper-raised border border-line-strong text-ink-muted px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
          {p.not_found === 1 && (
            <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5">
              unverifiable
            </span>
          )}
        </div>
        {(() => {
          const price = formatPrice(p);
          if (price.kind === "unresolved") {
            return (
              <span className="text-sm mt-1.5 text-ink-faint italic">
                {p.source_url ? "See website for pricing" : "Price not confirmed"}
              </span>
            );
          }
          if (price.kind === "linkOnly") {
            return <span className="text-sm mt-1.5 text-ink-faint italic">Pricing on product page</span>;
          }
          return (
            <span className="text-sm mt-1.5 tabular-nums text-ink">
              {price.text}
              {price.caution && <span className="text-amber-600 ml-1">&#9888;</span>}
            </span>
          );
        })()}
      </Link>
      {link && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-matcha hover:text-forest transition-colors mt-1.5"
        >
          {link.label} &rarr;
        </a>
      )}
    </div>
  );
}

// Same info as ProductCard, but as the featured "one per price tier" pick --
// bolder border and a tier-name badge instead of the plain brand/grade line.
export function TieredPickCard({ label, product: p }: { label: string; product: ProductRow }) {
  const price = formatPrice(p);
  const link = getExternalLinkInfo(p.source_url);
  return (
    <div className="border-2 border-matcha rounded-sm p-4 bg-paper hover:bg-matcha-soft transition-colors flex flex-col gap-1">
      <Link href={`/products/${p.id}`} className="flex flex-col gap-1">
        <span className="inline-block self-start rounded-full bg-matcha text-paper px-2.5 py-0.5 text-xs font-medium tracking-wide mb-1">
          {label}
        </span>
        <span className="flex items-center gap-2">
          <BrandLogo brandName={p.brand_name} />
          <span className="text-base font-bold text-ink">{p.brand_name}</span>
        </span>
        <span className="text-sm text-ink-muted leading-snug">{p.product_name}</span>
        {link && <span className="text-xs text-ink-faint truncate">{link.hostname}</span>}
        {price.kind === "resolved" && (
          <span className="text-sm mt-1.5 tabular-nums text-ink">{price.text}</span>
        )}
      </Link>
      {link && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-matcha hover:text-forest transition-colors mt-1.5"
        >
          {link.label} &rarr;
        </a>
      )}
    </div>
  );
}
