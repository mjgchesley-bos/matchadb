import { supabaseAnon } from "@/lib/supabase-server";
import type { OwnerMenuFile, OwnerPage, OwnerPhoto } from "@/lib/cafe-owner-page";

// What a café's verified owner has put on its page (public read; supabase/cafe_pages.sql). Null when the café has no owner page (or the tables are not set up yet).
export type OwnerProduct = { id: string; name: string; description: string; price: string; url: string | null };
export type OwnerData = { page: OwnerPage; photos: OwnerPhoto[]; files: OwnerMenuFile[]; products: OwnerProduct[] };
// True when an account owns the café (supabase/cafe_has_owner.sql). False until that has been run, so the page falls back to "has an owner page".
export async function cafeHasOwner(cafeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAnon().rpc("cafe_has_owner", { p_cafe_id: cafeId });
    return !error && data === true;
  } catch {
    return false;
  }
}
export async function getOwnerData(cafeId: string): Promise<OwnerData | null> {
  try {
    const sb = supabaseAnon();
    const { data: page, error } = await sb.from("cafe_pages").select("*").eq("cafe_id", cafeId).maybeSingle();
    if (error || !page) return null;
    const [ph, mf, pr] = await Promise.all([
      sb.from("cafe_photos").select("id, path, caption, sort").eq("cafe_id", cafeId).order("sort").order("created_at"),
      sb.from("cafe_menu_files").select("id, path, label, kind, sort").eq("cafe_id", cafeId).order("sort").order("created_at"),
      sb.rpc("cafe_products", { p_cafe_id: cafeId }),  // needs supabase/cafe_products.sql; quietly empty until it has been run
    ]);
    return { page: page as OwnerPage, photos: (ph.data ?? []) as OwnerPhoto[], files: (mf.data ?? []) as OwnerMenuFile[], products: pr.error ? [] : ((pr.data ?? []) as OwnerProduct[]) };
  } catch {
    return null;
  }
}
