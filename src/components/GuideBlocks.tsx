import type { Group } from "@/lib/guide-data";
import { usd30 } from "@/lib/unit-price";
import { getT, getTV } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

export const usd = (n: number | null) => (n == null ? "n/a" : `$${n.toFixed(2)}`);

// Median / middle-half price per 30 g for each group of products, with a bar
// scaled to the largest median in the table. Shared by guide, cultivar and
// comparison pages so they read as one family.
export function GroupTable({ title, rows, label, showBrands = true, lang = "en", kind = "plain" }: { title: string; rows: Group[]; label: string; showBrands?: boolean; lang?: Locale; kind?: "grade" | "region" | "plain" }) {
  if (rows.length === 0) return null;
  const t = getT(lang);
  const tv = getTV(lang);
  const rowName = (n: string) => (n === "Not stated" ? t("gt.notStated") : kind === "plain" ? n : tv(kind, n));
  const max = Math.max(...rows.map((r) => r.median ?? 0), 0.01);
  return (
    <div className="border border-line rounded-sm bg-paper-raised px-3 sm:px-5 py-4">
      <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] sm:text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="font-normal pb-2 pr-3 sm:pr-4">{label}</th>
              <th className="font-normal pb-2 pr-3 sm:pr-4 text-right">{t("gt.products")}</th>
              {showBrands && <th className="font-normal pb-2 pr-3 sm:pr-4 text-right hidden sm:table-cell">{t("gt.brands")}</th>}
              <th className="font-normal pb-2 pr-3 sm:pr-4">{t("gt.median")}</th>
              <th className="font-normal pb-2 text-right whitespace-nowrap">{t("gt.mid")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line">
                <td className="py-2 pr-3 sm:pr-4 text-ink">{rowName(r.name)}</td>
                <td className="py-2 pr-3 sm:pr-4 text-right tabular-nums text-ink-muted">{r.count}</td>
                {showBrands && <td className="py-2 pr-3 sm:pr-4 text-right tabular-nums text-ink-muted hidden sm:table-cell">{r.brands}</td>}
                <td className="py-2 pr-3 sm:pr-4">
                  <span className="flex items-center gap-2">
                    <span className="hidden sm:block h-2 w-24 rounded-full bg-matcha-soft overflow-hidden shrink-0" aria-hidden="true">
                      <span className="block h-full bg-matcha rounded-full" style={{ width: `${((r.median ?? 0) / max) * 100}%` }} />
                    </span>
                    <span className="tabular-nums text-ink">{usd30(r.median)}</span>
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-ink-muted whitespace-nowrap">
                  {usd30(r.p25)}&ndash;{usd30(r.p75)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
