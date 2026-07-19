"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { BrowseFilters } from "@/lib/db";
import { gradeLabel } from "./product-cards";

// Bigger, bouncier pill than the browse-page sidebar's PillCheckbox -- this
// is the "fun matching tool" surface, not a dense search form, so it gets
// room to breathe and a hover lift instead of a flat border swap. Controlled
// (checked, not defaultChecked) since state now comes from the URL via
// router.push rather than native form submission.
function MatchPill({
  name,
  value,
  label,
  checked,
  onToggle,
}: {
  name: string;
  value: string;
  label?: string;
  checked: boolean;
  onToggle: (name: string, value: string, checked: boolean) => void;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onToggle(name, value, e.target.checked)}
        className="peer sr-only"
      />
      <span className="inline-block rounded-full border-2 border-line-strong px-4 py-2 text-sm sm:text-base font-medium text-ink-muted transition-all duration-150 hover:-translate-y-0.5 hover:border-matcha hover:shadow-sm peer-checked:bg-matcha peer-checked:text-paper peer-checked:border-matcha peer-checked:-translate-y-0.5 peer-checked:shadow-md">
        {label || value}
      </span>
    </label>
  );
}

function MatchGroup({ prompt, children }: { prompt: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg sm:text-xl text-ink mb-3">{prompt}</p>
      <div className="flex flex-wrap justify-center gap-2.5">{children}</div>
    </div>
  );
}

// Ceremonial/Culinary/Latte grade are distinct product types; Usucha/Koicha
// are the thin/thick preparation-style pair -- grouped together at the end
// rather than interleaved alphabetically (which split them apart).
const GRADE_ORDER = ["Ceremonial", "Culinary", "Latte grade", "Usucha", "Koicha"];
function sortGrades(grades: string[]): string[] {
  return [...grades].sort((a, b) => {
    const ai = GRADE_ORDER.indexOf(a);
    const bi = GRADE_ORDER.indexOf(b);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });
}

// Home's abbreviated matching tool -- deliberately just three facets
// (grade/use/flavor), not the full search form. Search, brand, region,
// price, and the QA-flag checkboxes are database-search concerns that live
// on /browse; this page is about matching a preference, not querying a
// dataset.
//
// No submit button: toggling a pill navigates immediately (router.push,
// scroll: false) rather than waiting for a form submit + full page load.
// Built from the `filters` prop (already parsed server-side from the URL)
// instead of useSearchParams(), so this doesn't need a Suspense boundary.
export function MatchTool({
  filters,
  options,
  clearHref,
}: {
  filters: BrowseFilters;
  options: { grades: string[]; flavors: string[]; uses: string[] };
  clearHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(name: string, value: string, checked: boolean) {
    const current: Record<string, string[]> = {
      grade: filters.grades ?? [],
      use: filters.uses ?? [],
      flavor: filters.flavors ?? [],
    };
    current[name] = checked
      ? [...current[name].filter((v) => v !== value), value]
      : current[name].filter((v) => v !== value);

    const params = new URLSearchParams();
    for (const [key, values] of Object.entries(current)) {
      for (const v of values) params.append(key, v);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/?${query}` : "/", { scroll: false });
    });
  }

  return (
    <div className={`flex flex-col gap-7 transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}>
      <MatchGroup prompt="How will you use it?">
        {options.uses.map((u) => (
          <MatchPill key={u} name="use" value={u} checked={filters.uses?.includes(u) ?? false} onToggle={handleToggle} />
        ))}
      </MatchGroup>

      <MatchGroup prompt="What grade?">
        {sortGrades(options.grades).map((g) => (
          <MatchPill
            key={g}
            name="grade"
            value={g}
            label={gradeLabel(g)}
            checked={filters.grades?.includes(g) ?? false}
            onToggle={handleToggle}
          />
        ))}
      </MatchGroup>

      <MatchGroup prompt="What flavor calls to you?">
        {options.flavors.map((f) => (
          <MatchPill key={f} name="flavor" value={f} checked={filters.flavors?.includes(f) ?? false} onToggle={handleToggle} />
        ))}
      </MatchGroup>

      <div className="flex justify-center">
        <Link href={clearHref} className="text-sm text-ink-faint hover:text-ink-muted transition-colors">
          Start over
        </Link>
      </div>
    </div>
  );
}
