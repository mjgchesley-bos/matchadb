import Image from "next/image";
import Link from "next/link";
import type { ProductRow } from "@/lib/db";
import { formatPrice } from "@/lib/price";
import { getExternalLinkInfo } from "@/lib/links";
import { getBrandLogoPath } from "@/lib/logos";

// A small, fixed-size chip for brand logos. Real logos come in wildly
// different aspect ratios and background assumptions (dark mark on
// transparent, light mark on transparent, already-white background) --
// wrapping every one in the same plain white box with object-contain is the
// one treatment that reads correctly regardless of which kind a given
// brand's asset happens to be, without inspecting each of the 93 files by
// hand.
function BrandLogo({ brandName, size = 28 }: { brandName: string; size?: number }) {
  const src = getBrandLogoPath(brandName);
  if (!src) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm bg-white shrink-0 overflow-hidden border border-line-strong/40"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`${brandName} logo`}
        width={size}
        height={size}
        className="object-contain p-0.5"
        style={{ width: "100%", height: "100%" }}
        unoptimized
      />
    </span>
  );
}

// Checkbox rendered as a toggle pill -- no client JS needed, since browsers
// natively submit one query param per checked box sharing the same `name`.
export function PillCheckbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label?: string;
  defaultChecked: boolean;
}) {
  return (
    // `relative` keeps the absolutely-positioned sr-only input's layout box
    // pinned to this label. On top of that, a browser's default action for
    // mousedown on a focusable element is to focus it AND, if not fully in
    // view, scroll it into view -- that scroll-into-view is the actual
    // jump. preventDefault stops that whole default action, and we focus
    // the input ourselves with preventScroll, the API built for exactly
    // this. The click/change that drives the actual toggle still fires
    // normally afterward.
    <label
      className="relative cursor-pointer"
      onMouseDown={(e) => {
        e.preventDefault();
        e.currentTarget.querySelector("input")?.focus({ preventScroll: true });
      }}
    >
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted transition-colors peer-hover:border-matcha peer-checked:bg-matcha peer-checked:text-paper peer-checked:border-matcha">
        {label || value}
      </span>
    </label>
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
          <span className="text-sm font-semibold text-ink">{p.brand_name}</span>
        </span>
        <span className="font-medium text-ink leading-snug">{p.product_name}</span>
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
          <span className="text-sm font-semibold text-ink">{p.brand_name}</span>
        </span>
        <span className="font-medium text-ink leading-snug">{p.product_name}</span>
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
