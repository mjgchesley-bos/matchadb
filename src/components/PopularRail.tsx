import Link from "next/link";
import type { ProductRow } from "@/lib/db";
import { formatPrice } from "@/lib/price";
import { BrandLogo } from "@/components/product-cards";

// "Popular right now": a few products mirroring the filter column on the home page. Member favorites
// come first (ranked by saves, shelf adds, ratings and reviews); well-known staples fill any gaps.
export function PopularRail({
  products,
  fromMembers,
  layout,
}: {
  products: ProductRow[];
  fromMembers: number;
  layout: "column" | "strip";
}) {
  if (products.length === 0) return null;
  const sub = fromMembers >= products.length ? "Most saved and rated by members" : "Member favorites and well-known staples";
  return (
    <section aria-labelledby={`popular-h-${layout}`}>
      <h2 id={`popular-h-${layout}`} className="font-mono text-sm tracking-[0.2em] uppercase text-forest">
        Popular right now
      </h2>
      <p className="mt-1.5 mb-4 text-xs text-ink-faint">{sub}</p>
      <ul className={layout === "column" ? "flex flex-col gap-3" : "flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4"}>
        {products.map((p, i) => {
          const price = formatPrice(p);
          return (
            <li key={p.id} className={layout === "strip" ? "w-60 shrink-0 snap-start sm:w-auto" : undefined}>
              <Link
                href={`/products/${p.id}`}
                className="flex h-full flex-col gap-1 rounded-sm border border-line bg-paper-raised p-3.5 transition-colors hover:border-matcha hover:bg-matcha-soft"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-ink-faint">{i + 1}</span>
                  <BrandLogo brandName={p.brand_name} size={22} />
                  <span className="truncate text-sm font-bold text-ink">{p.brand_name}</span>
                </span>
                <span className="line-clamp-2 text-sm leading-snug text-ink-muted">{p.product_name}</span>
                {price.kind === "resolved" && <span className="mt-0.5 text-sm tabular-nums text-ink">{price.text}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
