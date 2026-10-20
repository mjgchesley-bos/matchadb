import { suggestKeywords } from "@/lib/studies";

// Keyword suggestions for the research search box. Reads only the local study
// index (no external calls); responses are cacheable because the index only
// changes when the library is rebuilt.
export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(
    { suggestions: suggestKeywords(q.slice(0, 60)) },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
  );
}
