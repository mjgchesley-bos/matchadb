"use client";

import { TierIcon, hasTierIcon } from "@/components/TierIcon";
import { useTV } from "@/i18n/client";

// A member's tier, shown next to their username on reviews and comments. New members (no medal
// yet) show nothing, so a badge means something.
export function TierBadge({ tier }: { tier?: string | null }) {
  const tv = useTV();
  if (!hasTierIcon(tier)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper px-2 py-0.5 text-[0.7rem] font-medium text-ink-muted">
      <TierIcon tier={tier} size={14} />
      {tv("tier", tier ?? "")}
    </span>
  );
}
