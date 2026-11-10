// Café suggestions go to a Supabase table (supabase/cafe_suggestions.sql). The URL and publishable key
// are meant to ship to every browser: Row Level Security lets that key add a row and nothing else.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnmAgCJBuiLfaLYCOmv25w_AMkQd0dS";

export type CafeSuggestion = {
  name: string;
  address: string;
  link?: string;
  note?: string;
  email?: string;
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
    const res = await fetch(`${URL}/rest/v1/cafe_suggestions`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name,
        address,
        link: clip(s.link, 300),
        note: clip(s.note, 500),
        email: clip(s.email, 200),
        locale: clip(s.locale, 8),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
