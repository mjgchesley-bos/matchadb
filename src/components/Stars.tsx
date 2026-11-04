"use client";

import { useId } from "react";

const STAR = "M12 2.5l2.95 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6 5.95 20.9l1.3-6.7-5-4.7 6.8-.8L12 2.5z";

// Five stars filled to `value` (0-5), including fractions.
export function Stars({ value, size = 28 }: { value: number; size?: number }) {
  const uid = useId();
  return (
    <span className="inline-flex text-gold" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const frac = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <clipPath id={`${uid}-${i}`}>
                <rect x="0" y="0" width={24 * frac} height="24" />
              </clipPath>
            </defs>
            <path d={STAR} fill="var(--color-paper-raised)" stroke="var(--color-line-strong)" strokeWidth="1.2" strokeLinejoin="round" />
            <path d={STAR} fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" clipPath={`url(#${uid}-${i})`} />
          </svg>
        );
      })}
    </span>
  );
}
