// Medal icons for the member tiers, and a green matcha cup for Matcha Master.
const MEDALS: Record<string, { ribbon: string; medal: string; rim: string; shine: string }> = {
  Bronze: { ribbon: "#8a5a2b", medal: "#cd7f32", rim: "#8a5a2b", shine: "#f0b27a" },
  Silver: { ribbon: "#6f7780", medal: "#c4cad1", rim: "#8b939c", shine: "#f2f4f6" },
  Gold: { ribbon: "#a06f0a", medal: "#e6b422", rim: "#b8860b", shine: "#fbe38b" },
};

export const hasTierIcon = (tier?: string | null): boolean => !!tier && (tier in MEDALS || tier === "Matcha Master");

export function TierIcon({ tier, size = 18 }: { tier?: string | null; size?: number }) {
  if (tier === "Matcha Master") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 2.5c-1 1.2 1 2 0 3.2M12 1.8c-1 1.2 1 2 0 3.2M15.5 2.5c-1 1.2 1 2 0 3.2" fill="none" stroke="#8fbf5a" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M2.5 9.5h19c0 5.6-3.9 9.5-9.5 9.5S2.5 15.1 2.5 9.5z" fill="#3f7d3a" />
        <ellipse cx="12" cy="9.5" rx="9.5" ry="2.4" fill="#9fcf6a" stroke="#3f7d3a" strokeWidth="1" />
        <rect x="8.5" y="18.6" width="7" height="2.6" rx="1.2" fill="#2f6030" />
      </svg>
    );
  }
  const m = tier ? MEDALS[tier] : undefined;
  if (!m) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 1h4l1.5 7.5L9 10 7 1zM17 1h-4l-1.5 7.5L15 10l2-9z" fill={m.ribbon} />
      <circle cx="12" cy="15.5" r="7" fill={m.medal} stroke={m.rim} strokeWidth="1.2" />
      <circle cx="12" cy="15.5" r="4.6" fill="none" stroke={m.shine} strokeWidth="1" />
      <path d="M12 12.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill={m.shine} />
    </svg>
  );
}
