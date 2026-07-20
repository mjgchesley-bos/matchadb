"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
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
    // `relative` keeps the absolutely-positioned sr-only input's layout box
    // pinned to this label rather than resolving against a distant
    // positioned ancestor (or the viewport). On top of that, a browser's
    // default action for mousedown on a focusable element is to both focus
    // it AND, if that element isn't fully in view, scroll it into view --
    // that scroll-into-view step is the actual jump. `preventDefault` here
    // stops that whole default action (including the browser-chosen scroll
    // target), and we then focus the input ourselves with `preventScroll`,
    // which is the API built specifically to move focus without scrolling.
    // The click/change events that drive the actual toggle still fire
    // normally afterward, untouched.
    <label
      className="relative cursor-pointer"
      onMouseDown={(e) => {
        e.preventDefault();
        e.currentTarget.querySelector("input")?.focus({ preventScroll: true });
      }}
    >
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

// Each prompt now carries the same size/weight/color the removed "Tell us
// what you're after" section heading used to have -- so the four questions
// read as a set of equal headings, not a heading plus sub-questions.
function MatchGroup({ prompt, children }: { prompt: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-3">{prompt}</p>
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
  const lastUserGesture = useRef(0);

  // Tracks the most recent genuine scroll-capable user input (wheel, touch,
  // arrow/page keys) so the revert logic below can tell "the user is
  // actually scrolling right now" apart from "something else moved the
  // page" -- without this, blindly reverting any scroll change would also
  // fight a user who deliberately scrolls right after clicking a pill.
  useEffect(() => {
    const mark = () => {
      lastUserGesture.current = Date.now();
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("keydown", mark);
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  // `router.push(..., { scroll: false })` stops Next from deliberately
  // scrolling to top, but something is still nudging scroll on every
  // toggle -- including on *unselecting* a pill, which rules out the
  // checkbox's own focus as the cause (a couple of targeted fixes aimed at
  // that already shipped and didn't help). The most likely remaining
  // culprit is Next's own router re-focusing a route announcer element
  // after each navigation, for accessibility -- not something app code can
  // reach into. Rather than keep guessing at the exact mechanism, this
  // watches for any scroll change shortly after a toggle and snaps back,
  // unless it looks like the user is genuinely scrolling themselves.
  function handleToggle(name: string, value: string, checked: boolean) {
    const savedY = window.scrollY;
    let active = true;
    const revert = () => {
      if (!active) return;
      const userIsScrolling = Date.now() - lastUserGesture.current < 150;
      if (!userIsScrolling && window.scrollY !== savedY) window.scrollTo(0, savedY);
    };
    window.addEventListener("scroll", revert, { passive: true });
    setTimeout(() => {
      active = false;
      window.removeEventListener("scroll", revert);
    }, 600);

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
      <MatchGroup prompt="How will you use it?">
        {uses.map((u) => (
          <MatchPill key={u} name="use" value={u} checked={filters.uses?.includes(u) ?? false} onToggle={handleToggle} />
        ))}
      </MatchGroup>

      <MatchGroup prompt="What grade?">
        {qualityGrades.map((g) => (
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

      {prepStyles.length > 0 && (
        <MatchGroup prompt="Prepared thin or thick?">
          {prepStyles.map((g) => (
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
      )}

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
