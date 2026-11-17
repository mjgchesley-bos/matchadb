import { getProducts, getFilterOptions } from "@/lib/db";
import { getCafeSlimIndex } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";
import { norm } from "@/lib/cafe-search";

// One search for the whole site (the bar in the header): a few products, brands and cafés that match what was typed.
type CafeKey = { id: string; name: string; city: string; state: string; cc: string; n: string; c: string };
let cafeKeys: CafeKey[] | null = null;
function keys(): CafeKey[] {
  if (cafeKeys) return cafeKeys;
  cafeKeys = [...getCafeSlimIndex().values()].map((r) => ({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] ?? "", n: norm(r[1]), c: norm(r[3]) }));
  return cafeKeys;
}

export async function GET(req: Request) {
  const raw = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const q = norm(raw);
  if (q.length < 2) return Response.json({ products: [], brands: [], cafes: [] });
  const words = q.split(" ");

  const [{ products }, opts] = await Promise.all([
    getProducts({ q: raw, page: 1, pageSize: 5, grades: [], flavors: [], uses: [] }),
    getFilterOptions(),
  ]);
  const brands = opts.brands
    .map((b) => ({ b, n: norm(b) }))
    .filter((x) => words.every((w) => x.n.includes(w)))
    .sort((a, c) => Number(c.n.startsWith(q)) - Number(a.n.startsWith(q)) || a.b.length - c.b.length)
    .slice(0, 5)
    .map((x) => x.b);

  const scored: { s: number; c: CafeKey }[] = [];
  for (const c of keys()) {
    const hay = `${c.n} ${c.c}`;
    if (!words.every((w) => hay.includes(w))) continue;
    scored.push({ s: (c.n.startsWith(q) ? 0 : c.n.includes(q) ? 1 : 2) * 1000 + c.name.length, c });
    if (scored.length > 400) break;
  }
  const cafes = scored
    .sort((a, b) => a.s - b.s)
    .slice(0, 5)
    .map(({ c }) => ({ name: c.name, city: c.city, slug: cafeSlug({ id: c.id, name: c.name, city: c.city, state: c.state, cc: c.cc }) }));

  return Response.json(
    {
      products: products.map((p) => ({ id: p.id, name: p.product_name, brand: p.brand_name })),
      brands,
      cafes,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
