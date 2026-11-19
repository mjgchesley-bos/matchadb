// The owner-managed café page (supabase/cafe_pages.sql): shared types and choices, used by the owner's editor and by the public café page.
export type AccentKey = "green" | "pink" | "gold" | "blue" | "plum" | "charcoal";

export type OwnerPage = {
  cafe_id: string;
  tagline: string | null;
  bio: string | null;
  matcha_info: string | null;
  announcement: string | null;
  cover_path: string | null;
  accent: AccentKey;
  hours: Record<string, string>;
  phone: string | null;
  public_email: string | null;
  website_url: string | null;
  order_url: string | null;
  reservation_url: string | null;
  links: Record<string, string>;
  amenities: string[];
};
export type OwnerPhoto = { id: string; path: string; caption: string | null; sort: number };
export type OwnerMenuFile = { id: string; path: string; label: string; kind: "pdf" | "image"; sort: number };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
export const cafeMediaUrl = (path: string): string => `${SUPABASE_URL}/storage/v1/object/public/cafe-media/${path}`;

// Colour themes: they re-colour the page's accent (buttons, links, highlights); the site's own tokens do the rest.
export const ACCENTS: Record<AccentKey, { label: string; matcha: string; forest: string; soft: string; ink: string }> = {
  green: { label: "Matcha green", matcha: "#3c7a2a", forest: "#2b5a20", soft: "#e4eed3", ink: "#27561b" },
  pink: { label: "Sakura pink", matcha: "#b5476f", forest: "#8a2f52", soft: "#f8e1ea", ink: "#7a2848" },
  gold: { label: "Hojicha gold", matcha: "#a06a14", forest: "#7a4f0e", soft: "#f6e8c8", ink: "#6e460c" },
  blue: { label: "Indigo blue", matcha: "#2f5f9e", forest: "#21447a", soft: "#dde8f6", ink: "#1f3f72" },
  plum: { label: "Plum", matcha: "#7a3f8f", forest: "#582b69", soft: "#eddff2", ink: "#4f2660" },
  charcoal: { label: "Charcoal", matcha: "#3d4a44", forest: "#27302c", soft: "#e4e8e5", ink: "#222b27" },
};
export const accentStyle = (k: AccentKey | null | undefined): Record<string, string> => {
  const a = ACCENTS[k ?? "green"] ?? ACCENTS.green;
  return { "--color-matcha": a.matcha, "--color-forest": a.forest, "--color-matcha-soft": a.soft, "--color-matcha-ink": a.ink };
};

export const NETWORKS = [
  { key: "instagram", label: "Instagram", ph: "https://instagram.com/yourcafe" },
  { key: "x", label: "X", ph: "https://x.com/yourcafe" },
  { key: "facebook", label: "Facebook", ph: "https://facebook.com/yourcafe" },
  { key: "tiktok", label: "TikTok", ph: "https://tiktok.com/@yourcafe" },
  { key: "youtube", label: "YouTube", ph: "https://youtube.com/@yourcafe" },
  { key: "threads", label: "Threads", ph: "https://threads.net/@yourcafe" },
  { key: "pinterest", label: "Pinterest", ph: "https://pinterest.com/yourcafe" },
  { key: "yelp", label: "Yelp", ph: "https://yelp.com/biz/your-cafe" },
  { key: "google_maps", label: "Google Maps", ph: "https://maps.app.goo.gl/..." },
  { key: "linkedin", label: "LinkedIn", ph: "https://linkedin.com/company/yourcafe" },
  { key: "spotify", label: "Spotify (your playlist)", ph: "https://open.spotify.com/playlist/..." },
] as const;

export const DAYS = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
] as const;

export const AMENITIES = [
  "Ceremonial matcha", "Matcha tasting", "Oat milk", "Dairy-free options", "Vegan options", "Gluten-free options", "Seating", "Outdoor seating", "Free Wi-Fi",
  "Takeaway", "Delivery", "Pet friendly", "Wheelchair accessible", "Workshops and events", "Matcha to take home", "Gift sets",
] as const;
