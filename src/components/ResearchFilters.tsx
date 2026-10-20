import Link from "next/link";
import { PillCheckbox } from "./PillCheckbox";
import type { StudyFilters, getLibraryFacets } from "@/lib/studies";

const fieldClass =
  "w-full border border-line-strong rounded-sm px-3 py-2 bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha transition-colors";
const labelClass = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";

type Facets = ReturnType<typeof getLibraryFacets>;

// A plain GET form (same approach as the product filters): no client state, the
// URL is the state, so every filtered view is shareable and back-button safe.
export function ResearchFilters({ filters, facets, clearHref }: { filters: StudyFilters; facets: Facets; clearHref: string }) {
  return (
    <form method="get" className="flex flex-col gap-5 text-sm">
      <div>
        <label className={labelClass} htmlFor="q">
          Search the library
        </label>
        <input id="q" name="q" defaultValue={filters.q} placeholder="Title, author, topic, keyword" className={fieldClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="from">
            From year
          </label>
          <input id="from" name="from" type="number" min={facets.minYear} max={facets.maxYear} defaultValue={filters.yearFrom} placeholder={String(facets.minYear)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="to">
            To year
          </label>
          <input id="to" name="to" type="number" min={facets.minYear} max={facets.maxYear} defaultValue={filters.yearTo} placeholder={String(facets.maxYear)} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="sort">
          Sort by
        </label>
        <select id="sort" name="sort" defaultValue={filters.sort || ""} className={fieldClass}>
          <option value="">{filters.q ? "Best match" : "Newest first"}</option>
          {filters.q && <option value="newest">Newest first</option>}
          <option value="oldest">Oldest first</option>
          <option value="cited">Most cited</option>
        </select>
      </div>

      <div>
        <span className={labelClass}>Study type</span>
        <div className="flex flex-wrap gap-2">
          {facets.designs
            .filter((d) => !d.name.startsWith("Other") && !d.name.startsWith("Not classified"))
            .map((d) => (
              <PillCheckbox key={d.name} name="design" value={d.name} label={`${d.name} (${d.count})`} defaultChecked={filters.designs?.includes(d.name) ?? false} />
            ))}
        </div>
      </div>

      <div>
        <span className={labelClass}>Topic</span>
        <div className="flex flex-wrap gap-2">
          {facets.topics.map((t) => (
            <PillCheckbox key={t.name} name="topic" value={t.name} label={`${t.name} (${t.count})`} defaultChecked={filters.topics?.includes(t.name) ?? false} />
          ))}
        </div>
      </div>

      <div>
        <span className={labelClass}>Format</span>
        <div className="flex flex-wrap gap-2">
          {facets.kinds.map((k) => (
            <PillCheckbox
              key={k.name}
              name="kind"
              value={k.name}
              label={`${{ article: "Articles", preprint: "Preprints", thesis: "Theses", book: "Books" }[k.name as "article"] ?? k.name} (${k.count})`}
              defaultChecked={filters.kinds?.includes(k.name) ?? false}
            />
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-ink-muted cursor-pointer">
        <input type="checkbox" name="oa" value="1" defaultChecked={filters.openAccessOnly} className="accent-matcha" />
        Free to read only ({facets.openAccess})
      </label>
      <label className="flex items-start gap-2 text-ink-muted cursor-pointer">
        <input type="checkbox" name="mentions" value="1" defaultChecked={filters.includeMentions} className="accent-matcha mt-0.5" />
        <span>
          Include papers that only mention matcha in passing <span className="text-ink-faint">(+{facets.mentionsExtra})</span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <button type="submit" className="rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors">
          Search
        </button>
        <Link href={clearHref} className="text-ink-faint hover:text-ink transition-colors">
          Clear
        </Link>
      </div>
    </form>
  );
}
