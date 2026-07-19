import Link from "next/link";
import type { BrowseFilters } from "@/lib/db";
import { gradeLabel } from "./product-cards";

// A bigger, bouncier pill than the browse-page sidebar's PillCheckbox --
// this is the "fun matching tool" surface, not a dense search form, so it
// gets room to breathe and a hover lift instead of a flat border swap.
function MatchPill({ name, value, label, defaultChecked }: { name: string; value: string; label?: string; defaultChecked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border-2 border-line-strong px-5 py-2.5 text-base font-medium text-ink-muted transition-all duration-150 hover:-translate-y-0.5 hover:border-matcha hover:shadow-sm peer-checked:bg-matcha peer-checked:text-paper peer-checked:border-matcha peer-checked:-translate-y-0.5 peer-checked:shadow-md">
        {label || value}
      </span>
    </label>
  );
}

function MatchGroup({ prompt, children }: { prompt: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl sm:text-2xl text-ink mb-5">{prompt}</p>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

// Home's abbreviated matching tool -- deliberately just three facets
// (grade/use/flavor), not the full search form. Search, brand, region,
// price, and the QA-flag checkboxes are database-search concerns that live
// on /browse; this page is about matching a preference, not querying a
// dataset.
export function MatchTool({
  filters,
  options,
  clearHref,
}: {
  filters: BrowseFilters;
  options: { grades: string[]; flavors: string[]; uses: string[] };
  clearHref: string;
}) {
  return (
    <form method="get" className="flex flex-col gap-12">
      <MatchGroup prompt="How will you use it?">
        {options.uses.map((u) => (
          <MatchPill key={u} name="use" value={u} defaultChecked={filters.uses?.includes(u) ?? false} />
        ))}
      </MatchGroup>

      <MatchGroup prompt="What grade?">
        {options.grades.map((g) => (
          <MatchPill key={g} name="grade" value={g} label={gradeLabel(g)} defaultChecked={filters.grades?.includes(g) ?? false} />
        ))}
      </MatchGroup>

      <MatchGroup prompt="What flavor calls to you?">
        {options.flavors.map((f) => (
          <MatchPill key={f} name="flavor" value={f} defaultChecked={filters.flavors?.includes(f) ?? false} />
        ))}
      </MatchGroup>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-matcha text-paper px-9 py-3.5 text-base font-medium tracking-wide transition-all hover:bg-forest hover:-translate-y-0.5 hover:shadow-md"
        >
          Find my matcha
        </button>
        <Link href={clearHref} className="text-sm text-ink-faint hover:text-ink-muted transition-colors">
          Start over
        </Link>
      </div>
    </form>
  );
}
