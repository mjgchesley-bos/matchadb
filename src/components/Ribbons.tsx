"use client";

import { useAuth } from "@/components/AuthProvider";
import { BADGES } from "@/lib/badges";
import { useT } from "@/i18n/client";

// Achievements shown as award ribbons beside the avatar: earned ones in colour, a few of the next ones faded with their hint.
const COLORS = ["#3f7d3a", "#2f5d8a", "#b5472f", "#7a4a8a", "#c9a227", "#c0577a", "#2f7a5a", "#8a6a3a"];

function Rosette({ color, earned }: { color: string; earned: boolean }) {
  const c = earned ? color : "#b9b9b0";
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <path d="M9 24l-5 17 8-4 5 6 4-18z" fill={c} opacity={earned ? 0.75 : 0.5} />
      <path d="M25 24l5 17-8-4-5 6-4-18z" fill={c} opacity={earned ? 0.95 : 0.5} />
      <circle cx="17" cy="15" r="13" fill={c} opacity={earned ? 1 : 0.55} />
      <circle cx="17" cy="15" r="9" fill="none" stroke="#fff" strokeOpacity={earned ? 0.7 : 0.5} strokeWidth="1.5" strokeDasharray="2 2" />
      {earned && <path d="M12 15l4 4 7-8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function Ribbons() {
  const t = useT();
  const { stats } = useAuth();
  if (!stats) return null;
  const rows = BADGES.map((b, i) => ({ i, earned: b.test(stats), name: t(`c.badge.${i}.n` as "c.badge.0.n"), hint: t(`c.badge.${i}.h` as "c.badge.0.h") }));
  const earned = rows.filter((r) => r.earned);
  const next = rows.filter((r) => !r.earned).slice(0, 3);
  return (
    <div className="w-36 shrink-0" aria-label={t("c.mp.ribbons")}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{t("c.mp.ribbons")}</p>
      {earned.length === 0 && <p className="mt-1 text-xs text-ink-faint">{t("c.mp.noRibbons")}</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {earned.map((r) => (
          <li key={r.i} className="flex items-center gap-2" title={r.name}>
            <Rosette color={COLORS[r.i % COLORS.length]} earned />
            <span className="text-xs font-medium leading-tight text-ink">{r.name}</span>
          </li>
        ))}
        {next.map((r) => (
          <li key={r.i} className="flex items-center gap-2" title={r.hint}>
            <Rosette color="#b9b9b0" earned={false} />
            <span className="text-xs leading-tight text-ink-faint">{r.name}</span>
          </li>
        ))}
      </ul>
      {rows.length - earned.length > next.length && <p className="mt-2 text-xs text-ink-faint">{t("c.mp.ribbonsLocked", { n: rows.length - earned.length - next.length })}</p>}
    </div>
  );
}
