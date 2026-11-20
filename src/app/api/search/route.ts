import { searchAll } from "@/lib/site-search";

// One search for the whole site (see src/lib/site-search.ts). The header box, the home page and the /search page all use it.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const r = await searchAll(u.searchParams.get("q") ?? "", { only: u.searchParams.get("only") ?? undefined });
  return Response.json(r, { headers: { "Cache-Control": "public, max-age=300" } });
}
