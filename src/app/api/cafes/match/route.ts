import { getAllCafes } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";
import { nameScore, norm } from "@/lib/cafe-search";

// Cafés on the map whose name matches a business name, with the host of each café's own website. Used by the staff approvals queue to pre-review
// café-owner requests (the café data is public, so nothing private is returned).
export async function GET(req: Request) {
  const raw = (new URL(req.url).searchParams.get("name") ?? "").trim().slice(0, 100);
  const q = norm(raw);
  if (q.length < 3) return Response.json([]);
  const hits: { s: number; c: ReturnType<typeof getAllCafes>[number] }[] = [];
  for (const c of getAllCafes()) {
    const s = nameScore(q, norm(c.name.replace(/\s*\(.*\)$/, "")));
    if (s >= 0.8) hits.push({ s, c });
  }
  hits.sort((a, b) => b.s - a.s);
  const host = (u: string | null) => {
    try {
      return u ? new URL(u).hostname.replace(/^www\./, "") : null;
    } catch {
      return null;
    }
  };
  return Response.json(
    hits.slice(0, 5).map(({ s, c }) => ({ id: c.id, name: c.name, city: c.city, cc: c.cc ?? "US", host: host(c.url), score: Math.round(s * 100) / 100, slug: cafeSlug(c) })),
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
