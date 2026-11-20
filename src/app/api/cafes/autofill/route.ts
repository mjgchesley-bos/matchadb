import { createClient } from "@supabase/supabase-js";
import { getAllCafes } from "@/lib/cafes";
import { extraPages, parseSite, type Suggestions } from "@/lib/autofill";

// "Fill in from public info" for a café owner's page editor: reads the café's own published website (home page plus a contact/hours page) and returns
// suggestions. The caller must be signed in and own the café. The address fetched is always the one already stored for the café, never one the caller
// supplies. Honest user agent, robots.txt honoured, short timeouts, small size cap, plain GETs only.
export const maxDuration = 30;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnmAgCJBuiLfaLYCOmv25w_AMkQd0dS";
const UA = "MatchaDB-owner-autofill/1.0 (+https://www.matchadb.com)";

const safeHost = (h: string) => !/^(localhost|.*\.local|.*\.internal)$/i.test(h) && !/^[\d.]+$/.test(h) && !h.includes(":");

async function get(u: string): Promise<string | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(9000), redirect: "follow" });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return (await r.text()).slice(0, 700_000);
  } catch { return null; }
}

async function allowed(origin: string, path: string): Promise<boolean> {
  try {
    const r = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return true;
    let applies = false;
    for (const line of (await r.text()).split(/\r?\n/)) {
      const l = line.split("#")[0].trim();
      if (/^user-agent:/i.test(l)) applies = l.slice(11).trim() === "*" || /matchadb/i.test(l);
      else if (applies && /^disallow:/i.test(l)) {
        const rule = l.slice(9).trim();
        if (rule && path.startsWith(rule)) return false;
      }
    }
    return true;
  } catch { return true; }
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const body = (await req.json().catch(() => ({}))) as { cafeId?: string };
  const id = body.cafeId ?? "";
  if (!auth.startsWith("Bearer ") || !/^([0-9a-f]{10}|fsq[0-9a-f]{7})$/.test(id)) return Response.json({ ok: false }, { status: 400 });
  const sb = createClient(URL_, KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("cafe_owners").select("cafe_id").eq("cafe_id", id).maybeSingle();
  if (!data) return Response.json({ ok: false }, { status: 403 });
  const cafe = getAllCafes().find((c) => c.id === id);
  if (!cafe) return Response.json({ ok: false }, { status: 404 });

  let found: Suggestions = {};
  let source: string | null = null;
  const site = cafe.url && /^https?:\/\//i.test(cafe.url) ? cafe.url : null;
  if (site && !/(instagram|facebook|linktr\.ee|tiktok)\./i.test(site)) {
    const u = new globalThis.URL(site);
    if (safeHost(u.hostname) && (await allowed(u.origin, u.pathname || "/"))) {
      const home = await get(u.href);
      if (home) {
        const pages = [{ url: u.href, html: home }];
        for (const extra of extraPages(home, u.href)) {
          const eu = new globalThis.URL(extra);
          if (!(await allowed(eu.origin, eu.pathname))) continue;
          const h = await get(extra);
          if (h) pages.push({ url: extra, html: h });
        }
        found = parseSite(pages, u.origin + (u.pathname === "/" ? "" : u.pathname), { city: cafe.city, street: cafe.address });
        source = u.hostname.replace(/^www\./, "");
      }
    }
  }
  if (site && /(instagram|facebook|tiktok)\./i.test(site)) {
    // The listing's only web address is a social page: that is itself the café's link for that network.
    const social = parseSite([{ url: site, html: `<a href="${site}">x</a>` }], "").links;
    if (social) found.links = { ...social, ...(found.links ?? {}) };
  }
  if (!found.phone && cafe.phone) found.phone = cafe.phone;
  if (!found.website_url && site && !/(instagram|facebook)\./i.test(site)) found.website_url = site;
  return Response.json({ ok: true, source, found });
}
