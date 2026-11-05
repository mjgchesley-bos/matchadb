import { createClient } from "@supabase/supabase-js";

// Server-side client for reading public data (public profiles) with the publishable key: it can
// do only what visitors who aren't signed in can do. Nothing here holds a session.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnmAgCJBuiLfaLYCOmv25w_AMkQd0dS";

export function supabaseAnon() {
  return createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
