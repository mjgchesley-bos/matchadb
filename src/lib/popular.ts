import { supabaseAnon } from "@/lib/supabase-server";

// Product ids ranked by member activity (saves, shelf adds, ratings, approved reviews), from the
// popular_products view. Empty until members have done something, and on any error, so the home
// page simply falls back to its editorial picks. Cached in memory so the home page doesn't call
// the database on every visit.
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; ids: number[] } | null = null;

export async function getCommunityPopularIds(): Promise<number[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.ids;
  try {
    const { data, error } = await supabaseAnon()
      .from("popular_products")
      .select("product_id, score")
      .order("score", { ascending: false })
      .limit(12)
      .abortSignal(AbortSignal.timeout(2500));
    if (error || !data) throw error ?? new Error("no data");
    const ids = (data as { product_id: number }[]).map((r) => r.product_id);
    cache = { at: Date.now(), ids };
    return ids;
  } catch {
    // Keep serving the last good answer if there is one; otherwise show no member picks.
    return cache?.ids ?? [];
  }
}
