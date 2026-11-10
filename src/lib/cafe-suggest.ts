import { supabase } from "@/lib/supabase";

// Café suggestions are for signed-in members. They go to a Supabase table (supabase/cafe_suggestions.sql): Row Level
// Security lets a signed-in member add a row for themselves and nothing else, and the database fills in who sent it,
// so there is no email box and nothing the browser could forge.
export type CafeSuggestion = {
  name: string;
  address: string;
  link?: string;
  locale?: string;
};

const clip = (s: string | undefined, n: number) => {
  const v = (s ?? "").trim().slice(0, n);
  return v || null;
};

/** Returns true when the suggestion was stored. */
export async function submitCafeSuggestion(s: CafeSuggestion): Promise<boolean> {
  const name = clip(s.name, 120);
  const address = clip(s.address, 200);
  if (!name || name.length < 2 || !address || address.length < 3) return false;
  try {
    const { error } = await supabase()
      .from("cafe_suggestions")
      .insert({ name, address, link: clip(s.link, 300), locale: clip(s.locale, 8) });
    return !error;
  } catch {
    return false;
  }
}
