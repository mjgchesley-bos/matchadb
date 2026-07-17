import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandProducts } from "@/lib/db";
import { formatPrice } from "@/lib/price";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const brandName = decodeURIComponent(brand);
  const products = await getBrandProducts(brandName);

  if (products.length === 0) notFound();

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <Link href="/browse" className="text-sm text-ink-muted hover:text-matcha transition-colors">
        &larr; All products
      </Link>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-3 mb-1.5">
        {brandName}
      </h1>
      <p className="text-sm text-ink-muted mb-8">
        {products.length} product{products.length === 1 ? "" : "s"} in the database
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="border border-line rounded-sm p-4 hover:border-matcha bg-paper-raised/40 hover:bg-paper-raised transition-colors flex flex-col gap-1"
          >
            <span className="font-medium text-ink">{p.product_name}</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
              {p.grade && (
                <span className="rounded-full bg-matcha-soft text-matcha-ink px-2 py-0.5">
                  {p.grade}
                </span>
              )}
              {p.has_contradictions === 1 && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5">
                  &#9888; flagged
                </span>
              )}
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
                return (
                  <span className="text-sm mt-1.5 text-ink-faint italic">
                    Pricing on product page
                  </span>
                );
              }
              return (
                <span className="text-sm mt-1.5 tabular-nums text-ink">
                  {price.text}
                  {price.caution && <span className="text-amber-600 ml-1">&#9888;</span>}
                </span>
              );
            })()}
          </Link>
        ))}
      </div>
    </main>
  );
}
