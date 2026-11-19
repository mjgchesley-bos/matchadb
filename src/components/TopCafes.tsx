import Link from "@/i18n/Link";
import { Stars } from "@/components/Stars";

export type TopCafe = { id: string; name: string; place: string; href: string | null; score: number };

// A member's five highest-rated cafés, shown under their bio.
export function TopCafes({ items }: { items: TopCafe[] }) {
  const top = [...items].sort((a, b) => b.score - a.score).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <section className="mt-4 max-w-xl rounded-sm border border-line bg-paper px-4 py-3" aria-label="Top rated cafés">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Top rated cafés</h2>
      <ol className="mt-2 flex flex-col divide-y divide-line">
        {top.map((c, i) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-4 shrink-0 text-xs tabular-nums text-ink-faint">{i + 1}</span>
              {c.href ? (
                <Link href={c.href} className="min-w-0 truncate font-medium text-ink hover:text-matcha hover:underline">{c.name}</Link>
              ) : (
                <span className="min-w-0 truncate font-medium text-ink">{c.name}</span>
              )}
              <span className="hidden shrink-0 text-xs text-ink-faint sm:inline">{c.place}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-ink-muted">
              <Stars value={c.score} size={13} />
              {c.score.toFixed(1)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
