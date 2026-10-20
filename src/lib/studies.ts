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
  sort?: "relevance" | "recommended" | "newest" | "oldest" | "cited";
  page?: number;
  pageSize?: number;
};

// ---------------------------------------------------------------- search
// Query syntax: words are ANDed; "quoted phrases" match exactly; OR separates
// alternatives; a leading minus excludes a word (-tea). Common scientific
// synonyms are matched too, so "egcg" also finds "epigallocatechin gallate".
const SYNONYMS: Record<string, string[]> = {
  egcg: ["epigallocatechin"],
  epigallocatechin: ["egcg"],
  catechin: ["catechins"],
  catechins: ["catechin"],
  theanine: ["l-theanine"],
  antioxidant: ["antioxidants", "antioxidative", "antioxidation"],
  antioxidants: ["antioxidant", "antioxidative"],
  polyphenol: ["polyphenols", "polyphenolic", "phenolic"],
  polyphenols: ["polyphenol", "phenolic"],
  cognition: ["cognitive", "memory", "attention", "executive function"],
  cognitive: ["cognition", "memory", "attention"],
  stress: ["anxiety", "cortisol"],
  anxiety: ["stress"],
  microbiome: ["microbiota"],
  microbiota: ["microbiome", "gut flora"],
  obesity: ["overweight", "body weight", "weight loss", "adipose"],
  weight: ["obesity", "body weight", "adipose"],
  cancer: ["tumor", "tumour", "carcinoma", "neoplasm"],
  caffeine: ["caffeinated"],
  diabetes: ["glucose", "insulin", "glycemic", "glycaemic"],
  cholesterol: ["lipid", "ldl"],
  shading: ["shade", "shaded", "shade-grown", "covering"],
  shade: ["shading", "shaded", "shade-grown"],
  pesticide: ["pesticides", "residue", "residues"],
  toxicity: ["toxic", "hepatotoxicity", "adverse"],
  "heavy metals": ["lead", "cadmium", "arsenic", "mercury"],
  sleep: ["insomnia", "sleep quality"],
  dementia: ["alzheimer", "alzheimers", "cognitive impairment"],
  alzheimer: ["alzheimers", "dementia"],
  flavor: ["flavour", "taste", "aroma"],
  flavour: ["flavor", "taste", "aroma"],
  color: ["colour", "chlorophyll", "greenness"],
  colour: ["color", "chlorophyll"],
  dental: ["oral", "periodontal", "teeth"],
  skin: ["dermal", "dermatology", "cosmetic"],
};

type Group = { must: string[]; not: string[] };
export type ParsedQuery = { groups: Group[]; highlight: string[] };

export function parseQuery(q: string): ParsedQuery {
  const norm = q.replace(/[“”]/g, '"').toLowerCase();
  const groups: Group[] = [];
  const highlight = new Set<string>();
  for (const part of norm.split(/\s+or\s+/)) {
    const must: string[] = [];
    const not: string[] = [];
    for (const m of part.matchAll(/(-?)"([^"]+)"|(-?)([\p{L}\p{N}][\p{L}\p{N}'-]*)/gu)) {
      const neg = (m[1] || m[3]) === "-";
      const term = (m[2] || m[4] || "").trim();
      if (term.length < 2) continue;
      (neg ? not : must).push(term);
      if (!neg) highlight.add(term);
    }
    if (must.length || not.length) groups.push({ must, not });
  }
  for (const g of groups) for (const t of g.must) for (const syn of SYNONYMS[t] ?? []) highlight.add(syn);
  return { groups, highlight: [...highlight].sort((a, b) => b.length - a.length) };
}

function haystack(s: Study) {
  return {
    title: s.title.toLowerCase(),
    meta: `${s.authors.join(" ")} ${s.journal} ${s.keywords.join(" ")} ${s.mesh.join(" ")} ${s.topics.join(" ")} ${s.design}`.toLowerCase(),
    abstract: s.abstract.toLowerCase(),
  };
}

const variants = (t: string) => [t, ...(SYNONYMS[t] ?? []), ...(t.endsWith("s") && t.length > 4 ? [t.slice(0, -1)] : [])];

// Score one study against the parsed query: 0 means no match. Each required term
// must appear (itself or a synonym) in the title, keywords/authors/journal, or
// abstract; excluded terms must not appear anywhere. Best OR-group wins.
function scoreStudy(s: Study, parsed: ParsedQuery): number {
  const h = haystack(s);
  const all = `${h.title} ${h.meta} ${h.abstract}`;
  let best = 0;
  for (const g of parsed.groups) {
    if (g.not.some((t) => variants(t).some((v) => all.includes(v)))) continue;
    let score = 0;
    let ok = true;
    for (const t of g.must) {
      let termScore = 0;
      for (const v of variants(t)) {
        const w = v === t ? 1 : 0.6;
        if (h.title.includes(v)) termScore = Math.max(termScore, 5 * w);
        if (h.meta.includes(v)) termScore = Math.max(termScore, 3 * w);
        if (h.abstract.includes(v)) termScore = Math.max(termScore, 1 * w);
      }
      if (!termScore) { ok = false; break; }
      score += termScore;
    }
    if (ok && (g.must.length || score === 0)) best = Math.max(best, score || 0.1);
  }
  return best;
}

// A short excerpt of the abstract around the first matched word, so each result
// shows where the keyword appears.
export function snippetFor(s: Study, highlight: string[], width = 240): string {
  if (!s.abstract) return "";
  const lower = s.abstract.toLowerCase();
  let at = -1;
  for (const t of highlight) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return s.abstract.length > width ? `${s.abstract.slice(0, width).replace(/\s+\S*$/, "")}…` : s.abstract;
  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(s.abstract.length, start + width);
  let body = s.abstract.slice(start, end);
  if (start > 0) body = body.replace(/^\S*\s/, "");
  if (end < s.abstract.length) body = body.replace(/\s\S*$/, "");
  return `${start > 0 ? "… " : ""}${body.trim()}${end < s.abstract.length ? " …" : ""}`;
}

// Keyword suggestions for the search box: author keywords and subject terms that
// appear in at least two studies, most common first.
const GENERIC = new Set(["matcha", "humans", "animals", "male", "female", "adult", "adults", "tea", "plant extracts", "mice", "rats", "middle aged", "aged", "young adult"]);
let keywordIndex: { name: string; count: number }[] | null = null;
function keywordList() {
  if (keywordIndex) return keywordIndex;
  const m = new Map<string, number>();
  for (const s of load().file.studies) {
    if (s.relevance === "mention") continue;
    const seen = new Set<string>();
    for (const k of [...s.keywords, ...s.mesh]) {
      const n = k.toLowerCase().trim();
      if (n.length < 3 || n.length > 40 || GENERIC.has(n) || seen.has(n)) continue;
      seen.add(n);
      m.set(n, (m.get(n) ?? 0) + 1);
    }
  }
  keywordIndex = [...m].filter(([, c]) => c >= 2).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return keywordIndex;
}

export function suggestKeywords(prefix: string, limit = 8) {
  const p = prefix.toLowerCase().trim();
  if (p.length < 2) return [];
  const list = keywordList();
  const starts = list.filter((k) => k.name.startsWith(p));
  const word = list.filter((k) => !k.name.startsWith(p) && k.name.split(/[\s-]+/).some((w) => w.startsWith(p)));
  return [...starts, ...word].slice(0, limit);
}

// The library's default view hides studies that mention matcha only once in
// passing (a coursework paper that lists it on a menu, say); a checkbox brings
// them back for anyone who wants a literal "every mention" search.
function baseSet(includeMentions: boolean) {
  return load().file.studies.filter((s) => includeMentions || s.relevance !== "mention");
}

// "Recommended" ordering: how recent, how widely cited, how established the venue,
// and how strong the study design is, each on a 0–1 scale. The library holds no
// author-affiliation data, so organizational standing is judged by the venue:
// MEDLINE/PubMed-indexed journals and a short list of major publishers and
// flagship journals count most; repositories, theses and preprints count least.
const MAJOR_VENUE =
  /^(nature|science|cell|the lancet|lancet|jama|bmj|plos|elsevier|springer|wiley|american chemical|acs |journal of agricultural and food chemistry|food chemistry|nutrients|foods|molecules|lwt|scientific reports|frontiers|journal of the science of food|food research international|antioxidants|critical reviews|trends in|annual review|comprehensive reviews|international journal of|journal of nutrition|american journal of clinical|british journal of nutrition|european journal of|food & function|food hydrocolloids|journal of functional foods|phytomedicine|heliyon)/i;
const REPOSITORY_VENUE = /(repositor|zenodo|ssrn|research square|preprint|irdb|doaj|digital library|e-commerce)/i;
const EVIDENCE: Record<string, number> = {
  "Systematic review / meta-analysis": 1,
  "Randomized controlled trial": 0.9,
  "Clinical trial (non-randomized)": 0.75,
  Review: 0.6,
  "Observational (human)": 0.6,
  "Animal study": 0.5,
  "Chemical / analytical": 0.5,
  "Food science / processing": 0.5,
  "Agronomy / cultivation": 0.5,
  "Sensory / consumer": 0.45,
  "In vitro / cell study": 0.4,
};
let maxCites = 0;
const standingCache = new Map<number, number>();
function standing(s: Study): number {
  const hit = standingCache.get(s.id);
  if (hit !== undefined) return hit;
  if (!maxCites) maxCites = Math.max(1, ...load().file.studies.map((x) => x.citedBy));
  const age = s.year ? Math.max(0, new Date().getFullYear() - s.year) : 20;
  const recency = Math.max(0, 1 - age / 12);
  const cites = Math.log1p(s.citedBy) / Math.log1p(maxCites);
  let venue = 0.15;
  if (s.kind === "article" && s.journal && !REPOSITORY_VENUE.test(s.journal)) {
    venue = MAJOR_VENUE.test(s.journal) ? 1 : s.pmid ? 0.8 : s.doi ? 0.5 : 0.3;
  }
  const evidence = EVIDENCE[s.design] ?? 0.25;
  const v = 0.3 * recency + 0.3 * cites + 0.25 * venue + 0.15 * evidence;
  standingCache.set(s.id, v);
  return v;
}

export function queryStudies(f: StudyFilters) {
  const pageSize = f.pageSize ?? 25;
  const parsed = f.q ? parseQuery(f.q) : { groups: [], highlight: [] };
  const hasQuery = parsed.groups.length > 0;
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
  if (hasQuery) {
    rows = rows.filter((s) => {
      const score = scoreStudy(s, parsed);
      if (!score) return false;
      scored.set(s.id, score);
      return true;
    });
  }

  const sort = f.sort ?? (hasQuery ? "relevance" : "recommended");
  const maxScore = Math.max(1, ...scored.values());
  rows = [...rows].sort((a, b) => {
    // Keyword searches blend how well the words match with how recent and recognized the study is,
    // so a strong match from a leading journal outranks an equally good match from a repository.
    if (sort === "relevance") {
      const blend = (s: Study) => 0.55 * ((scored.get(s.id) ?? 0) / maxScore) + 0.45 * standing(s);
      return blend(b) - blend(a) || (b.year ?? 0) - (a.year ?? 0);
    }
    if (sort === "recommended") return standing(b) - standing(a) || (b.year ?? 0) - (a.year ?? 0);
    if (sort === "oldest") return (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title);
    if (sort === "cited") return b.citedBy - a.citedBy || (b.year ?? 0) - (a.year ?? 0);
    return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title);
  });

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, f.page ?? 1), totalPages);
  return { studies: rows.slice((page - 1) * pageSize, page * pageSize), total, page, totalPages, highlight: parsed.highlight };
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
