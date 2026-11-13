import Link from "@/i18n/Link";
import type { BrowseFilters } from "@/lib/db";
import { gradeLabel } from "./product-cards";
import { PillCheckbox } from "./PillCheckbox";
import { SHIP_REGIONS } from "@/lib/shipping";
import { shipRegionLabel } from "./ShippingNote";
import { getT, getTV } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

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
  "w-full border border-line-strong rounded-sm px-3 py-2.5 bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha focus:ring-2 focus:ring-matcha/20 transition-colors";
// Group headings: the site's green monospace eyebrow style, so they read as headings and not as more content.
const labelClass = "block font-mono text-[0.7rem] font-medium tracking-[0.18em] uppercase text-forest mb-2.5";
// One filter group: padded, separated from the next by a thin rule.
const groupClass = "px-4 py-4";

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
  formClassName = "rounded-sm border border-line bg-paper-raised text-sm",
  wideClassName = "",
  lang = "en",
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
  lang?: Locale;
}) {
  const t = getT(lang);
  const tv = getTV(lang);
  return (
    <form method="get" className={formClassName}>
      <h2 className="flex items-center gap-2 rounded-t-sm border-b border-line bg-matcha-soft px-4 py-3 font-display text-lg font-semibold text-ink">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="text-matcha">
          <path d="M2 4h12M4.5 8h7M7 12h2" />
        </svg>
        {t("f.title")}
      </h2>
      <div className="divide-y divide-line">
      <div className={groupClass}>
        <label className={labelClass} htmlFor="q">
          {t("f.search")}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={filters.q}
          placeholder={t("f.searchPh")}
          className={fieldClass}
        />
      </div>

      <div className={groupClass}>
        <label className={labelClass} htmlFor="brand">
          {t("f.brand")}
        </label>
        <select id="brand" name="brand" defaultValue={filters.brand || ""} className={fieldClass}>
          <option value="">{t("f.allBrands")}</option>
          {options.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className={groupClass}>
        <span className={labelClass}>{t("f.grade")}</span>
        <div className="flex flex-wrap gap-2">
          {sortByOrder(
            options.grades.filter((g) => QUALITY_ORDER.includes(g)),
            QUALITY_ORDER
          ).map((g) => (
            <PillCheckbox
              key={g}
              name="grade"
              value={g}
              label={gradeLabel(g, tv)}
              defaultChecked={filters.grades?.includes(g) ?? false}
            />
          ))}
        </div>
      </div>

      {options.grades.some((g) => PREP_ORDER.includes(g)) && (
        <div className={groupClass}>
          <span className={labelClass}>{t("f.prep")}</span>
          <div className="flex flex-wrap gap-2">
            {sortByOrder(
              options.grades.filter((g) => PREP_ORDER.includes(g)),
              PREP_ORDER
            ).map((g) => (
              <PillCheckbox
                key={g}
                name="grade"
                value={g}
                label={gradeLabel(g, tv)}
                defaultChecked={filters.grades?.includes(g) ?? false}
              />
            ))}
          </div>
        </div>
      )}

      <div className={groupClass}>
        <span className={labelClass}>{t("f.use")}</span>
        <div className="flex flex-wrap gap-2">
          {sortByOrder(options.uses, USE_ORDER).map((u) => (
            <PillCheckbox key={u} name="use" value={u} label={tv("use", u)} defaultChecked={filters.uses?.includes(u) ?? false} />
          ))}
        </div>
      </div>

      <div className={groupClass}>
        <span className={labelClass}>{t("f.flavor")}</span>
        <div className="flex flex-wrap gap-2">
          {options.flavors.map((f) => (
            <PillCheckbox key={f} name="flavor" value={f} label={tv("flavor", f)} defaultChecked={filters.flavors?.includes(f) ?? false} />
          ))}
        </div>
      </div>

      <div className={groupClass}>
        <label className={labelClass} htmlFor="region">
          {t("f.region")}
        </label>
        <select id="region" name="region" defaultValue={filters.region || ""} className={fieldClass}>
          <option value="">{t("f.anyRegion")}</option>
          {options.regions.map((r) => (
            <option key={r} value={r}>
              {tv("region", r)}
            </option>
          ))}
        </select>
      </div>

      <div className={groupClass}>
        <label className={labelClass} htmlFor="ships">
          {t("f.ships")}
        </label>
        <select id="ships" name="ships" defaultValue={filters.shipsTo || ""} className={fieldClass}>
          <option value="">{t("f.any")}</option>
          {SHIP_REGIONS.map((r) => (
            <option key={r} value={r}>
              {shipRegionLabel(r, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className={`${groupClass} ${wideClassName}`}>
        <span className={labelClass}>{t("f.price")}</span>
        <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="minPrice">
            {t("f.min")}
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
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="maxPrice">
            {t("f.max")}
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
      </div>

      <div className={`${groupClass} flex flex-col gap-3 ${wideClassName}`}>
        <span className={`${labelClass} mb-0`}>{t("f.only")}</span>
        <label className="flex items-center gap-2.5 text-ink">
          <input
            type="checkbox"
            name="organicOnly"
            value="1"
            defaultChecked={filters.organicOnly}
            className="h-4 w-4 accent-matcha"
          />
          {t("f.organic")}
        </label>

        <label className="flex items-center gap-2.5 text-ink">
          <input
            type="checkbox"
            name="wholesaleOnly"
            value="1"
            defaultChecked={filters.wholesaleOnly}
            className="h-4 w-4 accent-matcha"
          />
          {t("f.wholesale")}
        </label>

        <label className="flex items-center gap-2.5 text-ink">
          <input
            type="checkbox"
            name="hasContradictionsOnly"
            value="1"
            defaultChecked={filters.hasContradictionsOnly}
            className="h-4 w-4 accent-matcha"
          />
          {t("f.contradictions")}
        </label>
      </div>

      </div>

      <div className={`sticky bottom-0 flex flex-col gap-2.5 rounded-b-sm border-t border-line bg-paper-raised px-4 py-4 ${wideClassName}`}>
        <button
          type="submit"
          className="rounded-full bg-matcha py-2.5 text-sm font-medium tracking-wide text-paper transition-colors hover:bg-forest"
        >
          {t("f.apply")}
        </button>
        <Link href={clearHref} className="text-center text-sm text-matcha underline underline-offset-2 transition-colors hover:text-forest">
          {t("f.clear")}
        </Link>
      </div>
    </form>
  );
}
