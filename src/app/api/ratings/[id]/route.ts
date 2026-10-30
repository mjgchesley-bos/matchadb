import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { getRatingState, isValidRating, ratingsConfigured, submitRating } from "@/lib/ratings";

// Community ratings for one product. GET returns the public summary plus this browser's own
// rating; POST saves a rating from this browser (one per browser per product, re-rating
// replaces it). The browser is identified by an anonymous random cookie, nothing else.

const COOKIE = "mdb_voter";
const ONE_YEAR = 60 * 60 * 24 * 365;
const NO_STORE = { "Cache-Control": "private, no-store" };

function readVoter(request: Request): string | null {
  const m = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{32})`));
  return m ? m[1] : null;
}

// Best-effort per-instance limits against scripted rating floods: per connection and per browser.
const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string, max: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { n: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  h.n++;
  return h.n > max;
}

async function productExists(id: number): Promise<boolean> {
  const db = await getDb();
  return db.exec("SELECT 1 FROM products WHERE id = ?", [id])[0]?.values.length > 0;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  return Response.json(await getRatingState(id, readVoter(request)), { headers: NO_STORE });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

  // Only accept ratings submitted from this site.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Not allowed" }, { status: 403, headers: NO_STORE });
  if (!ratingsConfigured) return Response.json({ error: "Ratings aren't available right now." }, { status: 503, headers: NO_STORE });

  let body: { rating?: unknown };
  try {
    const text = await request.text();
    if (text.length > 200) throw new Error("too large");
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  }
  if (!isValidRating(body.rating)) return Response.json({ error: "Pick a rating from 0.5 to 5 stars." }, { status: 400, headers: NO_STORE });
  if (!(await productExists(id))) return Response.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const voter = readVoter(request) ?? randomBytes(16).toString("hex");
  const ipKey = "ip:" + createHash("sha256").update(ip).digest("hex").slice(0, 16);
  if (limited(ipKey, 40) || limited("v:" + voter, 60)) {
    return Response.json({ error: "Too many ratings from this connection. Try again later." }, { status: 429, headers: NO_STORE });
  }

  try {
    const state = await submitRating(id, voter, body.rating);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json(state, {
      headers: { ...NO_STORE, "Set-Cookie": `${COOKIE}=${voter}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax${secure}` },
    });
  } catch {
    return Response.json({ error: "Couldn't save your rating. Please try again." }, { status: 503, headers: NO_STORE });
  }
}
