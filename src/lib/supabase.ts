import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Accounts, favorites, ratings and reviews live in Supabase. Both values below are meant to
// ship to every browser: the URL is public, and the publishable key can only do what the
// Row Level Security policies in supabase/schema.sql allow. The secret key is never used by
// the site; it exists only for the moderation script.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnmAgCJBuiLfaLYCOmv25w_AMkQd0dS";

let client: SupabaseClient | null = null;

// Browser-only singleton (the session is kept in the browser and refreshed there).
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(URL, PUBLISHABLE_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
