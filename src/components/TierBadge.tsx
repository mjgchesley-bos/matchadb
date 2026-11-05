// A member's tier, shown next to their username on reviews and comments. New members (Seedling)
// show nothing, so a badge means something.
const STYLES: Record<string, string> = {
  Sprout: "bg-matcha-soft text-matcha-ink",
  "Shaded Leaf": "bg-matcha-soft text-forest",
  Tencha: "bg-forest text-paper",
  "Matcha Master": "bg-ink text-paper",
};

export function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier || !STYLES[tier]) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${STYLES[tier]}`}>{tier}</span>;
}
