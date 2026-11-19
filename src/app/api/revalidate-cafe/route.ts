import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getCafeSlimIndex } from "@/lib/cafes";
import { cafeSlug } from "@/lib/cafe-types";
import { LOCALES } from "@/i18n/config";

// After a café owner saves their page, refresh that café's cached public page right away. The caller must be signed in and own the café
// (their own token can read their own cafe_owners row; nobody else's).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnmAgCJBuiLfaLYCOmv25w_AMkQd0dS";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const body = (await req.json().catch(() => ({}))) as { cafeId?: string };
  const id = body.cafeId ?? "";
  if (!auth.startsWith("Bearer ") || !/^([0-9a-f]{10}|fsq[0-9a-f]{7})$/.test(id)) return Response.json({ ok: false }, { status: 400 });
  const sb = createClient(URL, KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("cafe_owners").select("cafe_id").eq("cafe_id", id).maybeSingle();
  if (!data) return Response.json({ ok: false }, { status: 403 });
  const r = getCafeSlimIndex().get(id);
  if (!r) return Response.json({ ok: false }, { status: 404 });
  const slug = cafeSlug({ id: r[0], name: r[1], city: r[3], state: r[4], cc: r[9] });
  for (const lang of LOCALES) revalidatePath(`/${lang}/cafes/${slug}`);
  revalidatePath(`/cafes/${slug}`);
  return Response.json({ ok: true });
}
