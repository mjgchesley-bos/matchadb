"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { BrowseFilters } from "@/lib/db";
import { gradeLabel } from "./product-cards";

// Bigger, bouncier pill than the browse-page sidebar's PillCheckbox -- this
// is the "fun matching tool" surface, not a dense search form, so it gets
// room to breathe and a hover lift instead of a flat border swap. Controlled
// (checked, not defaultChecked) since state now comes from the URL via
// router.push rather than native form submission. `focused` grows the pill
// slightly when its group is the one currently guiding the user (see
// activeGroup below), then shrinks back once attention moves on.
function MatchPill({
  name,
  value,
  label,
  checked,
  focused,
  onToggle,
}: {
  name: string;
  value: string;
  label?: string;
  checked: boolean;
  focused: boolean;
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
      <span
        className={`inline-block rounded-full border-2 border-line-strong font-medium text-ink-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-matcha hover:shadow-sm peer-checked:bg-matcha peer-checked:text-paper peer-checked:border-matcha peer-checked:-translate-y-0.5 peer-checked:shadow-md ${
          focused ? "px-5 py-2.5 text-base sm:text-lg" : "px-4 py-2 text-sm sm:text-base"
        }`}
      >
        {label || value}
      </span>
    </label>
  );
}

// groupRef is a plain callback (not a forwarded ref) so the parent can key
// each group's DOM node by name for the IntersectionObserver below.
function MatchGroup({
  prompt,
  focused,
  groupRef,
  children,
}: {
  prompt: string;
  focused: boolean;
  groupRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div ref={groupRef} className="text-center">
      <p
        className={`font-display text-ink mb-3 transition-all duration-300 ${
          focused ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
        }`}
      >
        {prompt}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">{children}</div>
    </div>
  );
}

// Usucha/Koicha are brewing styles (thin tea vs. thick tea), not a quality
// tier comparable to Ceremonial/Culinary -- both pairs still write to the
// same underlying `grade` column/filter (that's the only place this data
// lives), but they're presented as two separate prompts so the tool doesn't
// imply "usucha" competes with "ceremonial" for the same slot.
// "Latte grade" is deliberately excluded here -- only one product in the
// whole catalog uses that literal grade label, and the real "good for
// lattes" signal already lives in the Use facet ("Lattes", 363 products),
// so surfacing it as a Grade option was just noise pointing at the wrong
// filter.
const QUALITY_ORDER = ["Ceremonial", "Culinary"];
const PREP_ORDER = ["Usucha", "Koicha"];
const USE_ORDER = ["Tea", "Lattes", "Culinary"];
function sortByOrder(values: string[], order: string[]): string[] {
  return [...values].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });
}

// The four prompts, in on-page order -- also the order emphasis advances
// through as the user answers each one.
const GROUP_ORDER = ["use", "grade", "preparation", "flavor"] as const;
type GroupKey = (typeof GROUP_ORDER)[number];

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

  // Which group is currently "guiding" the user -- starts on the first
  // prompt, moves forward as the user scrolls past a group or answers it.
  const [activeGroup, setActiveGroup] = useState<GroupKey>("use");
  const groupRefs = useRef<Partial<Record<GroupKey, HTMLDivElement | null>>>({});

  useEffect(() => {
    // Groups sit close enough together that an IntersectionObserver "band"
    // often has two of them satisfying it at once (a race between
    // independent observers). Picking whichever group's center is nearest
    // the viewport's vertical center avoids that ambiguity -- exactly one
    // winner at any scroll position.
    let rafId: number | null = null;
    function updateActiveGroup() {
      rafId = null;
      const centerY = window.innerHeight / 2;
      let closestKey: GroupKey | null = null;
      let closestDist = Infinity;
      for (const key of GROUP_ORDER) {
        const el = groupRefs.current[key];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          closestKey = key;
        }
      }
      if (closestKey) setActiveGroup(closestKey);
    }
    function onScroll() {
      if (rafId == null) rafId = requestAnimationFrame(updateActiveGroup);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

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

  // Wraps handleToggle so picking an option also immediately advances
  // emphasis to the next prompt, instead of waiting for the user to scroll.
  function makeToggle(groupKey: GroupKey) {
    return (name: string, value: string, checked: boolean) => {
      handleToggle(name, value, checked);
      const idx = GROUP_ORDER.indexOf(groupKey);
      if (idx !== -1 && idx < GROUP_ORDER.length - 1) setActiveGroup(GROUP_ORDER[idx + 1]);
    };
  }

  const uses = sortByOrder(options.uses, USE_ORDER);
  const qualityGrades = sortByOrder(
    options.grades.filter((g) => QUALITY_ORDER.includes(g)),
    QUALITY_ORDER
  );
  const prepStyles = sortByOrder(
    options.grades.filter((g) => PREP_ORDER.includes(g)),
    PREP_ORDER
  );

  return (
    <div className={`flex flex-col gap-7 transition-opacity duration-200 ${isPending ? "opacity-50" : ""}`}>
      <MatchGroup
        prompt="How will you use it?"
        focused={activeGroup === "use"}
        groupRef={(el) => {
          groupRefs.current.use = el;
        }}
      >
        {uses.map((u) => (
          <MatchPill
            key={u}
            name="use"
            value={u}
            checked={filters.uses?.includes(u) ?? false}
            focused={activeGroup === "use"}
            onToggle={makeToggle("use")}
          />
        ))}
      </MatchGroup>

      <MatchGroup
        prompt="What grade?"
        focused={activeGroup === "grade"}
        groupRef={(el) => {
          groupRefs.current.grade = el;
        }}
      >
        {qualityGrades.map((g) => (
          <MatchPill
            key={g}
            name="grade"
            value={g}
            label={gradeLabel(g)}
            checked={filters.grades?.includes(g) ?? false}
            focused={activeGroup === "grade"}
            onToggle={makeToggle("grade")}
          />
        ))}
      </MatchGroup>

      {prepStyles.length > 0 && (
        <MatchGroup
          prompt="Prepared thin or thick?"
          focused={activeGroup === "preparation"}
          groupRef={(el) => {
            groupRefs.current.preparation = el;
          }}
        >
          {prepStyles.map((g) => (
            <MatchPill
              key={g}
              name="grade"
              value={g}
              label={gradeLabel(g)}
              checked={filters.grades?.includes(g) ?? false}
              focused={activeGroup === "preparation"}
              onToggle={makeToggle("preparation")}
            />
          ))}
        </MatchGroup>
      )}

      <MatchGroup
        prompt="What flavor calls to you?"
        focused={activeGroup === "flavor"}
        groupRef={(el) => {
          groupRefs.current.flavor = el;
        }}
      >
        {options.flavors.map((f) => (
          <MatchPill
            key={f}
            name="flavor"
            value={f}
            checked={filters.flavors?.includes(f) ?? false}
            focused={activeGroup === "flavor"}
            onToggle={makeToggle("flavor")}
          />
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
