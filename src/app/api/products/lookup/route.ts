import { getProductById } from "@/lib/db";
import { formatPrice } from "@/lib/price";

// Name, brand and price for a handful of product ids, so signed-in pages (My matcha) can show
// the products a person saved or rated without shipping the whole catalog to the browser.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  const products = await Promise.all(ids.map((id) => getProductById(id)));
  const items = products.flatMap((p) => {
    if (!p) return [];
    const price = formatPrice(p);
    return [{ id: p.id, name: p.product_name, brand: p.brand_name, price: price.kind === "resolved" ? price.text : null }];
  });
  return Response.json(items, { headers: { "Cache-Control": "public, max-age=300" } });
}
