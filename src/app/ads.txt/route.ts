// ads.txt tells ad buyers which sellers are authorized to sell this site's
// inventory. It's served only once an ad network publisher ID is configured
// (ADSENSE_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX in Amplify's environment
// variables); before that there is nothing legitimate to authorize, so it
// returns 404 rather than an empty or fabricated file.
export const dynamic = "force-dynamic";

export function GET() {
  const publisherId = process.env.ADSENSE_PUBLISHER_ID;
  if (!publisherId) return new Response("Not found", { status: 404 });
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
