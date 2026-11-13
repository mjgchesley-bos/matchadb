import fs from "node:fs";
import path from "node:path";
import { getCafeSlimIndex } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";

// Venues taken off the map: id -> [name, city, country, why]. Lets the staff log say what a rated or commented
// café was and why it is gone, instead of showing a bare id. Written by scripts/cafes/weekly/export_removed.py.
let removed: Record<string, [string, string, string, string]> | null = null;
function removedIndex() {
  if (removed) return removed;
  try {
    removed = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafes-removed.json"), "utf8"));
  } catch {
    removed = {};
  }
  return removed!;
}

// Name, city and page address for a handful of café ids, for the staff activity log (the finder's data is public).
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => /^([0-9a-f]{10}|fsq[0-9a-f]{7})$/.test(s)))].slice(0, 100);
  const idx = getCafeSlimIndex();
  const items = ids.flatMap((id) => {
    const r = idx.get(id);
    if (r) return [{ id, name: r[1], city: r[3], slug: cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] }) }];
    const g = removedIndex()[id];
    return g ? [{ id, name: g[0], city: g[1], slug: "", removed: g[3] || "removed from the map" }] : [];
  });
  return Response.json(items, { headers: { "Cache-Control": "public, max-age=300" } });
}
