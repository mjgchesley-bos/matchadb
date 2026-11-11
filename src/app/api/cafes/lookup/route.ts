import { getCafeSlimIndex } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";

// Name, city and page address for a handful of café ids, for the staff activity log (the finder's data is public).
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => /^([0-9a-f]{10}|fsq[0-9a-f]{7})$/.test(s)))].slice(0, 100);
  const idx = getCafeSlimIndex();
  const items = ids.flatMap((id) => {
    const r = idx.get(id);
    if (!r) return [];
    return [{ id, name: r[1], city: r[3], slug: cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] }) }];
  });
  return Response.json(items, { headers: { "Cache-Control": "public, max-age=300" } });
}
