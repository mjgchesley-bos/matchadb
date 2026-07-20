import Link from "next/link";
import type { BrowseFilters } from "@/lib/db";
import { gradeLabel } from "./product-cards";
import { PillCheckbox } from "./PillCheckbox";

// Usucha/Koicha are brewing styles, not a quality tier -- both still filter
// on the same underlying `grade` column, but get their own labeled section
// so they don't read as competing with Ceremonial/Culinary for one slot.
// "Latte grade" is excluded -- only one product uses that literal label, and
// the real "good for lattes" signal lives in the Use facet ("Lattes", 363
// products) instead.
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

const fieldClass =
  "w-full border border-line-strong rounded-sm px-3 py-2 bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha transition-colors";
const labelClass = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";

export type FilterOptions = {
  brands: string[];
  grades: string[];
  regions: string[];
  flavors: string[];
  uses: string[];
};

// Renders with no explicit `action` -- a GET form with no action submits to
// the current page's own URL, so the same component works unchanged on both
// "/" and "/browse".
export function FilterForm({
  filters,
  options,
  clearHref,
  formClassName = "flex flex-col gap-5 text-sm",
  wideClassName = "",
}: {
  filters: BrowseFilters;
  options: FilterOptions;
  clearHref: string;
  // Sidebar usage (/browse) keeps the default narrow flex-column stack. Home
  // page passes a wider responsive grid instead -- wideClassName spans the
  // full grid width for elements that shouldn't sit in a single column (the
  // price-range pair, checkboxes, submit button, clear link); harmless
  // no-op in the flex layout.
  formClassName?: string;
  wideClassName?: string;
}) {
  return (
    <form method="get" className={formClassName}>
      <div>
        <label className={labelClass} htmlFor="q">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder="Brand or product name"
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="brand">
          Brand
        </label>
        <select id="brand" name="brand" defaultValue={filters.brand || ""} className={fieldClass}>
          <option value="">All brands</option>
          {options.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={labelClass}>Grade</span>
        <div className="flex flex-wrap gap-2">
          {sortByOrder(
            options.grades.filter((g) => QUALITY_ORDER.includes(g)),
            QUALITY_ORDER
          ).map((g) => (
            <PillCheckbox
              key={g}
              name="grade"
              value={g}
              label={gradeLabel(g)}
              defaultChecked={filters.grades?.includes(g) ?? false}
            />
          ))}
        </div>
      </div>

      {options.grades.some((g) => PREP_ORDER.includes(g)) && (
        <div>
          <span className={labelClass}>Preparation style</span>
          <div className="flex flex-wrap gap-2">
            {sortByOrder(
              options.grades.filter((g) => PREP_ORDER.includes(g)),
              PREP_ORDER
            ).map((g) => (
              <PillCheckbox
                key={g}
                name="grade"
                value={g}
                label={gradeLabel(g)}
                defaultChecked={filters.grades?.includes(g) ?? false}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className={labelClass}>Use</span>
        <div className="flex flex-wrap gap-2">
          {sortByOrder(options.uses, USE_ORDER).map((u) => (
            <PillCheckbox key={u} name="use" value={u} defaultChecked={filters.uses?.includes(u) ?? false} />
          ))}
        </div>
      </div>

      <div>
        <span className={labelClass}>Flavor</span>
        <div className="flex flex-wrap gap-2">
          {options.flavors.map((f) => (
            <PillCheckbox key={f} name="flavor" value={f} defaultChecked={filters.flavors?.includes(f) ?? false} />
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="region">
          Region
        </label>
        <select id="region" name="region" defaultValue={filters.region || ""} className={fieldClass}>
          <option value="">Any region</option>
          {options.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className={`flex gap-3 ${wideClassName}`}>
        <div className="flex-1">
          <label className={labelClass} htmlFor="minPrice">
            Min $
          </label>
          <input
            id="minPrice"
            name="minPrice"
            type="number"
            step="0.01"
            defaultValue={filters.minPrice}
            className={fieldClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="maxPrice">
            Max $
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            step="0.01"
            defaultValue={filters.maxPrice}
            className={fieldClass}
          />
        </div>
      </div>

      <div className={`flex gap-3 ${wideClassName}`}>
        <div className="flex-1">
          <label className={labelClass} htmlFor="minTheanine">
            Min L-theanine (mg/g)
          </label>
          <input
            id="minTheanine"
            name="minTheanine"
            type="number"
            step="0.1"
            defaultValue={filters.minTheanine}
            className={fieldClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="minEgcg">
            Min EGCG (mg/g)
          </label>
          <input
            id="minEgcg"
            name="minEgcg"
            type="number"
            step="0.1"
            defaultValue={filters.minEgcg}
            className={fieldClass}
          />
        </div>
      </div>

      <div className={`flex flex-col gap-3 ${wideClassName}`}>
        <label className="flex items-center gap-2.5 text-ink-muted">
          <input
            type="checkbox"
            name="organicOnly"
            value="1"
            defaultChecked={filters.organicOnly}
            className="accent-matcha"
          />
          Organic-certified only
        </label>

        <label className="flex items-center gap-2.5 text-ink-muted">
          <input
            type="checkbox"
            name="hasContradictionsOnly"
            value="1"
            defaultChecked={filters.hasContradictionsOnly}
            className="accent-matcha"
          />
          Flag: has contradictions
        </label>
      </div>

      <div className={`flex flex-col gap-3 ${wideClassName}`}>
        <button
          type="submit"
          className="bg-matcha text-paper py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors"
        >
          Apply filters
        </button>
        <Link href={clearHref} className="text-center text-ink-faint hover:text-ink-muted transition-colors">
          Clear all
        </Link>
      </div>
    </form>
  );
}
