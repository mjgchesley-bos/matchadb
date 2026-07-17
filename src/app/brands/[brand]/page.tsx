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
    <main className="flex-1 max-w-4xl mx-auto w-full p-6">
      <Link href="/browse" className="text-sm text-green-700 dark:text-green-400 hover:underline">
        &larr; All products
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">{brandName}</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {products.length} product{products.length === 1 ? "" : "s"} in the database
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 hover:border-green-600 transition-colors flex flex-col gap-1"
          >
            <span className="font-medium">{p.product_name}</span>
            <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
              {p.grade && (
                <span className="rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5">
                  {p.grade}
                </span>
              )}
              {p.has_contradictions === 1 && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5">
                  ⚠ flagged
                </span>
              )}
              {p.not_found === 1 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5">
                  unverifiable
                </span>
              )}
            </div>
            {(() => {
              const price = formatPrice(p);
              if (price.kind === "unresolved") {
                return (
                  <span className="text-sm mt-1 text-neutral-400 italic">
                    {p.source_url ? "See website for pricing" : "Price not confirmed"}
                  </span>
                );
              }
              if (price.kind === "linkOnly") {
                return (
                  <span className="text-sm mt-1 text-neutral-400 italic">
                    Pricing on product page
                  </span>
                );
              }
              return (
                <span className="text-sm mt-1">
                  {price.text}
                  {price.caution && <span className="text-amber-600 ml-1">⚠</span>}
                </span>
              );
            })()}
          </Link>
        ))}
      </div>
    </main>
  );
}
