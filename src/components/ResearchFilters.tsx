import Link from "@/i18n/Link";
import { PillCheckbox } from "./PillCheckbox";
import type { StudyFilters, getLibraryFacets } from "@/lib/studies";
import { getT, getTV } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

const fieldClass =
  "w-full border border-line-strong rounded-sm px-3 py-2 bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha transition-colors";
const labelClass = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";

type Facets = ReturnType<typeof getLibraryFacets>;

// A plain GET form (same approach as the product filters): no client state, the
// URL is the state, so every filtered view is shareable and back-button safe.
export function ResearchFilters({ filters, facets, clearHref, lang = "en" }: { filters: StudyFilters; facets: Facets; clearHref: string; lang?: Locale }) {
  const t = getT(lang);
  const tv = getTV(lang);
  return (
    <form id="research-filters" method="get" className="flex flex-col gap-5 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="from">
            {t("rs.f.from")}
          </label>
          <input id="from" name="from" type="number" min={facets.minYear} max={facets.maxYear} defaultValue={filters.yearFrom} placeholder={String(facets.minYear)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="to">
            {t("rs.f.to")}
          </label>
          <input id="to" name="to" type="number" min={facets.minYear} max={facets.maxYear} defaultValue={filters.yearTo} placeholder={String(facets.maxYear)} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="sort">
          {t("rs.f.sort")}
        </label>
        <select id="sort" name="sort" defaultValue={filters.sort || ""} className={fieldClass}>
          <option value="">{filters.q ? t("rs.f.best") : t("rs.f.rec")}</option>
          <option value="newest">{t("rs.f.newest")}</option>
          <option value="oldest">{t("rs.f.oldest")}</option>
          <option value="cited">{t("rs.f.cited")}</option>
        </select>
      </div>

      <div>
        <span className={labelClass}>{t("rs.f.design")}</span>
        <div className="flex flex-wrap gap-2">
          {facets.designs
            .filter((d) => !d.name.startsWith("Other") && !d.name.startsWith("Not classified"))
            .map((d) => (
              <PillCheckbox key={d.name} name="design" value={d.name} label={`${tv("design", d.name)} (${d.count})`} defaultChecked={filters.designs?.includes(d.name) ?? false} />
            ))}
        </div>
      </div>

      <div>
        <span className={labelClass}>{t("rs.f.topic")}</span>
        <div className="flex flex-wrap gap-2">
          {facets.topics.map((tp) => (
            <PillCheckbox key={tp.name} name="topic" value={tp.name} label={`${tv("topic", tp.name)} (${tp.count})`} defaultChecked={filters.topics?.includes(tp.name) ?? false} />
          ))}
        </div>
      </div>

      <div>
        <span className={labelClass}>{t("rs.f.format")}</span>
        <div className="flex flex-wrap gap-2">
          {facets.kinds.map((k) => (
            <PillCheckbox
              key={k.name}
              name="kind"
              value={k.name}
              label={`${["article", "preprint", "thesis", "book"].includes(k.name) ? t(`rs.kind.plural.${k.name}` as "rs.kind.plural.article") : k.name} (${k.count})`}
              defaultChecked={filters.kinds?.includes(k.name) ?? false}
            />
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-ink-muted cursor-pointer">
        <input type="checkbox" name="oa" value="1" defaultChecked={filters.openAccessOnly} className="accent-matcha" />
        {t("rs.f.oa", { n: facets.openAccess })}
      </label>
      <label className="flex items-start gap-2 text-ink-muted cursor-pointer">
        <input type="checkbox" name="mentions" value="1" defaultChecked={filters.includeMentions} className="accent-matcha mt-0.5" />
        <span>
          {t("rs.f.mentions")} <span className="text-ink-faint">(+{facets.mentionsExtra})</span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <button type="submit" className="rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors">
          {t("rs.f.apply")}
        </button>
        <Link href={clearHref} className="text-ink-faint hover:text-ink transition-colors">
          {t("rs.f.clear")}
        </Link>
      </div>
    </form>
  );
}
