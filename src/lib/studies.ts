import fs from "node:fs";
import path from "node:path";

// The Global Matcha Research Library: every indexed paper, thesis, book chapter
// and preprint that names matcha, harvested by scripts/harvest-studies.mjs from
// PubMed, OpenAlex and Europe PMC into data/studies.json. Only bibliographic
// data and the abstract are kept -- full texts stay with their publishers and
// every study links back to its source.

export type Study = {
  id: number;
  title: string;
  authors: string[];
  journal: string;
  year: number | null;
  doi: string | null;
  pmid: string | null;
  pmcid: string | null;
  language: string | null;
  design: string;
  topics: string[];
  matchaIn: string | null;
  relevance: "subject" | "studied" | "mention";
  mentions: number;
  abstract: string;
  keywords: string[];
  mesh: string[];
  pubTypes: string[];
  isOa: boolean;
  oaUrl: string | null;
  citedBy: number;
  sources: string[];
  kind: "article" | "preprint" | "thesis" | "book";
};

type StudiesFile = { generatedAt: string; count: number; studies: Study[] };

let cache: { file: StudiesFile; byId: Map<number, Study> } | null = null;

function load() {
  if (cache) return cache;
  const raw = fs.readFileSync(path.join(process.cwd(), "data", "studies.json"), "utf-8");
  const file = JSON.parse(raw) as StudiesFile;
  cache = { file, byId: new Map(file.studies.map((s) => [s.id, s])) };
  return cache;
}

export function getStudy(id: number): Study | undefined {
  return load().byId.get(id);
}

export function getAllStudyIds(): number[] {
  return load().file.studies.map((s) => s.id);
}

export function getLibraryMeta() {
  const { file } = load();
  return { generatedAt: file.generatedAt, total: file.studies.length };
}

export const KIND_LABEL: Record<Study["kind"], string> = {
  article: "Journal article",
  preprint: "Preprint",
  thesis: "Thesis or dissertation",
  book: "Book or chapter",
};

export type StudyFilters = {
  q?: string;
  designs?: string[];
  topics?: string[];
  kinds?: string[];
  yearFrom?: number;
  yearTo?: number;
  openAccessOnly?: boolean;
  includeMentions?: boolean;
  sort?: "relevance" | "newest" | "oldest" | "cited";
  page?: number;
  pageSize?: number;
};

const tokens = (q: string) =>
  q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

function haystack(s: Study) {
  return {
    title: s.title.toLowerCase(),
    meta: `${s.authors.join(" ")} ${s.journal} ${s.keywords.join(" ")} ${s.mesh.join(" ")} ${s.topics.join(" ")} ${s.design}`.toLowerCase(),
    abstract: s.abstract.toLowerCase(),
  };
}

// The library's default view hides studies that mention matcha only once in
// passing (a coursework paper that lists it on a menu, say); a checkbox brings
// them back for anyone who wants a literal "every mention" search.
function baseSet(includeMentions: boolean) {
  return load().file.studies.filter((s) => includeMentions || s.relevance !== "mention");
}

export function queryStudies(f: StudyFilters) {
  const pageSize = f.pageSize ?? 25;
  const toks = f.q ? tokens(f.q) : [];
  let rows = baseSet(!!f.includeMentions).filter((s) => {
    if (f.designs?.length && !f.designs.includes(s.design)) return false;
    if (f.topics?.length && !f.topics.some((t) => s.topics.includes(t))) return false;
    if (f.kinds?.length && !f.kinds.includes(s.kind)) return false;
    if (f.yearFrom && (s.year ?? 0) < f.yearFrom) return false;
    if (f.yearTo && (s.year ?? 9999) > f.yearTo) return false;
    if (f.openAccessOnly && !s.isOa) return false;
    return true;
  });

  const scored = new Map<number, number>();
  if (toks.length) {
    rows = rows.filter((s) => {
      const h = haystack(s);
      let score = 0;
      for (const t of toks) {
        const inTitle = h.title.includes(t);
        const inMeta = h.meta.includes(t);
        const inAbs = h.abstract.includes(t);
        if (!inTitle && !inMeta && !inAbs) return false;
        score += (inTitle ? 5 : 0) + (inMeta ? 3 : 0) + (inAbs ? 1 : 0);
      }
      scored.set(s.id, score);
      return true;
    });
  }

  const sort = f.sort ?? (toks.length ? "relevance" : "newest");
  rows = [...rows].sort((a, b) => {
    if (sort === "relevance") return (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0) || (b.year ?? 0) - (a.year ?? 0);
    if (sort === "oldest") return (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title);
    if (sort === "cited") return b.citedBy - a.citedBy || (b.year ?? 0) - (a.year ?? 0);
    return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title);
  });

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, f.page ?? 1), totalPages);
  return { studies: rows.slice((page - 1) * pageSize, page * pageSize), total, page, totalPages };
}

export function getLibraryFacets(includeMentions = false) {
  const set = baseSet(includeMentions);
  const count = (pick: (s: Study) => string[]) => {
    const m = new Map<string, number>();
    for (const s of set) for (const v of pick(s)) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n }));
  };
  const years = set.map((s) => s.year).filter((y): y is number => y != null);
  const byYear = new Map<number, number>();
  for (const y of years) byYear.set(y, (byYear.get(y) ?? 0) + 1);
  return {
    total: set.length,
    designs: count((s) => [s.design]),
    topics: count((s) => s.topics),
    kinds: count((s) => [s.kind]),
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
    byYear: [...byYear].sort((a, b) => a[0] - b[0]).map(([year, n]) => ({ year, count: n })),
    openAccess: set.filter((s) => s.isOa).length,
    withDoi: set.filter((s) => s.doi).length,
    mentionsExtra: load().file.studies.filter((s) => s.relevance === "mention").length,
  };
}

// ---------------------------------------------------------------- links + citations
export function studyLinks(s: Study) {
  return {
    doi: s.doi ? `https://doi.org/${s.doi}` : null,
    pubmed: s.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/` : null,
    pmc: s.pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${s.pmcid}/` : null,
    openAccess: s.oaUrl,
  };
}

export function formatAuthors(authors: string[], max = 3): string {
  if (!authors.length) return "Authors not listed";
  const shown = authors.slice(0, max).join(", ");
  return authors.length > max ? `${shown}, et al.` : shown;
}

export function apaCitation(s: Study): string {
  const au = s.authors.length ? (s.authors.length > 7 ? `${s.authors.slice(0, 6).join(", ")}, … ${s.authors[s.authors.length - 1]}` : s.authors.join(", ")) : "";
  const parts = [au && `${au}.`, s.year ? `(${s.year}).` : "(n.d.).", `${s.title.replace(/\.$/, "")}.`, s.journal && `${s.journal}.`, s.doi && `https://doi.org/${s.doi}`];
  return parts.filter(Boolean).join(" ");
}

export function bibtexCitation(s: Study): string {
  const first = (s.authors[0] || "study").split(/\s+/)[0].replace(/[^A-Za-z]/g, "") || "study";
  const key = `${first}${s.year ?? ""}matcha${s.id}`;
  const esc = (t: string) => t.replace(/[{}]/g, "").replace(/&/g, "\\&");
  const fields = [
    `  title = {${esc(s.title)}}`,
    s.authors.length ? `  author = {${s.authors.map(esc).join(" and ")}}` : null,
    s.journal ? `  journal = {${esc(s.journal)}}` : null,
    s.year ? `  year = {${s.year}}` : null,
    s.doi ? `  doi = {${s.doi}}` : null,
    s.pmid ? `  note = {PMID ${s.pmid}}` : null,
  ].filter(Boolean);
  return `@article{${key},\n${fields.join(",\n")}\n}`;
}

export function risCitation(s: Study): string {
  const lines = ["TY  - JOUR", `TI  - ${s.title}`, ...s.authors.map((a) => `AU  - ${a}`), s.journal && `JO  - ${s.journal}`, s.year && `PY  - ${s.year}`, s.doi && `DO  - ${s.doi}`, s.pmid && `AN  - ${s.pmid}`, "ER  - "];
  return lines.filter(Boolean).join("\n");
}

export const DESIGN_BLURB: Record<string, string> = {
  "Randomized controlled trial": "People were randomly assigned to matcha or a comparison.",
  "Systematic review / meta-analysis": "A structured search and combined analysis of earlier studies.",
  "Clinical trial (non-randomized)": "Human intervention study without random assignment.",
  Review: "A narrative or scoping review of the literature.",
  "Observational (human)": "Surveys, cohorts and consumer studies, with no intervention.",
  "Animal study": "Experiments in mice, rats, fish or other animals.",
  "In vitro / cell study": "Lab experiments on cells or isolated systems.",
  "Chemical / analytical": "Measuring what is in matcha, or how to detect it.",
  "Food science / processing": "Making, milling, storing or using matcha in foods.",
  "Agronomy / cultivation": "Growing, shading and harvesting tea for matcha.",
  "Sensory / consumer": "Taste, aroma, color and how people perceive matcha.",
};
