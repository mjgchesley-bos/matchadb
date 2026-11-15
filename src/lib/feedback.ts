import { supabase } from "@/lib/supabase";

// Feedback and feature requests from signed-in members (supabase/feedback.sql): Row Level Security lets a member add a
// row for themselves and nothing else; the database fills in who sent it. The owner reads them in the /admin activity log.
export async function submitFeedback(message: string, page: string, locale: string): Promise<boolean> {
  const m = message.trim().slice(0, 2000);
  if (m.length < 3) return false;
  try {
    const { error } = await supabase().from("feedback").insert({ message: m, page: page.slice(0, 200), locale: locale.slice(0, 8) });
    return !error;
  } catch {
    return false;
  }
}
