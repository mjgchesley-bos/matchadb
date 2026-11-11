import type { MemberStats } from "@/components/AuthProvider";

// Badges are earned from the activity counts the database reports for a member.
export const BADGES: { name: string; hint: string; test: (s: MemberStats) => boolean }[] = [
  { name: "First rating", hint: "Rate a matcha", test: (s) => s.ratings >= 1 },
  { name: "Taster", hint: "Rate 10 matchas", test: (s) => s.ratings >= 10 },
  { name: "Reviewer", hint: "Post a review", test: (s) => s.reviews >= 1 },
  { name: "In the conversation", hint: "Post a comment", test: (s) => s.comments >= 1 },
  { name: "Photographer", hint: "Share a photo", test: (s) => s.photos >= 1 },
  { name: "Brand collector", hint: "Save 5 brands", test: (s) => s.brands >= 5 },
  { name: "Café explorer", hint: "Save 3 cafés", test: (s) => (s.cafes ?? 0) >= 3 },
  { name: "Shelf builder", hint: "Put 10 matchas on your shelf", test: (s) => s.shelf >= 10 },
  { name: "Researcher", hint: "Save 3 studies", test: (s) => s.bookmarks >= 3 },
  { name: "Regular", hint: "Visit on 5 different days", test: (s) => s.days >= 5 },
  { name: "Devoted", hint: "Visit on 30 different days", test: (s) => s.days >= 30 },
];

// The labels are translated through the "v.how.*" keys; these are the English fallbacks.
export const HOW_LABELS: Record<string, string> = {
  lattes: "Lattes",
  usucha: "Usucha (thin tea)",
  koicha: "Koicha (thick tea)",
  iced: "Iced",
  baking: "Baking and cooking",
  everything: "Everything",
};
