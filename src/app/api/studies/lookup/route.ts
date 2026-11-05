import { getStudy } from "@/lib/studies";

// Title, journal and year for a handful of studies, so My matcha can list a member's research folder.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);
  const items = ids.flatMap((id) => {
    const s = getStudy(id);
    return s ? [{ id: s.id, title: s.title, journal: s.journal, year: s.year }] : [];
  });
  return Response.json(items, { headers: { "Cache-Control": "public, max-age=3600" } });
}
