// Harvests the scientific literature on matcha into data/studies.json.
//
// Sources (all free/open APIs): PubMed (NCBI E-utilities), OpenAlex, Europe PMC.
// A paper is included only if the word "matcha" appears in its title, abstract,
// author keywords, or MeSH/subject terms AND the text has tea context (so the
// surname "Matcha" and unrelated uses are filtered out). Everything else is
// written to data/studies-excluded.json so the filter can be audited.
//
// Each study gets rule-based tags (study design + topics) computed from its own
// title/abstract/MeSH terms -- no model, nothing invented. Ids are stable: once a
// study has a number it keeps it (data/study-id-registry.json), because
// /research/[id] URLs get indexed and linked to.
//
// Usage: node scripts/harvest-studies.mjs [--no-oa]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
const OUT = path.join(__dirname, "..", "data", "studies.json");
const EXCLUDED = path.join(__dirname, "..", "data", "studies-excluded.json");
const REGISTRY = path.join(__dirname, "..", "data", "study-id-registry.json");
const KEY = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : "";
const MAILTO = "mjgchesley@gmail.com";
const OA_KEY = process.env.OPENALEX_API_KEY ? `&api_key=${process.env.OPENALEX_API_KEY}` : "";
const UA = { "User-Agent": `MatchaDB literature harvest (${MAILTO})` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      // 401/403 from OpenAlex means the shared keyless daily budget is momentarily spent.
      if (r.status === 429 || r.status === 401 || r.status === 403 || r.status >= 500) { await sleep(8000 * (i + 1)); continue; }
      if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 120)}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(3000 * (i + 1));
    }
  }
}
async function getText(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(90000) });
      if (r.status === 429 || r.status >= 500) { await sleep(4000 * (i + 1)); continue; }
      if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 120)}`);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(3000 * (i + 1));
    }
  }
}

const decode = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const normDoi = (d) => (d || "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim() || null;
const normTitle = (t) => (t || "").toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// ---------------------------------------------------------------- PubMed
async function pubmed() {
  const term = encodeURIComponent('matcha[Title/Abstract] OR matcha[Other Term] OR "matcha tea"[All Fields] OR matcha[MeSH Terms]');
  const s = await getJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=10000&term=${term}${KEY}`);
  const ids = s.esearchresult.idlist;
  console.log("PubMed ids:", ids.length);
  const out = [];
  for (let i = 0; i < ids.length; i += 150) {
    await sleep(KEY ? 120 : 400);
    const xml = await getText(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.slice(i, i + 150).join(",")}${KEY}`);
    for (const m of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
      const b = m[1];
      const pick = (re) => (b.match(re) || [])[1];
      const abstractParts = [...b.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((a) => {
        const label = (a[1].match(/Label="([^"]+)"/) || [])[1];
        const t = decode(a[2]);
        return label && !/^(UNLABELLED|UNASSIGNED)$/i.test(label) ? `${label[0] + label.slice(1).toLowerCase()}: ${t}` : t;
      });
      const authors = [...b.matchAll(/<Author [^>]*>([\s\S]*?)<\/Author>/g)]
        .map((a) => {
          const last = decode((a[1].match(/<LastName>([\s\S]*?)<\/LastName>/) || [])[1]);
          const ini = decode((a[1].match(/<Initials>([\s\S]*?)<\/Initials>/) || [])[1]);
          const coll = decode((a[1].match(/<CollectiveName>([\s\S]*?)<\/CollectiveName>/) || [])[1]);
          return coll || (last ? `${last}${ini ? " " + ini : ""}` : "");
        })
        .filter(Boolean);
      const year = pick(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || (pick(/<MedlineDate>(\d{4})/) ?? null);
      out.push({
        pmid: pick(/<PMID[^>]*>(\d+)<\/PMID>/),
        doi: normDoi(decode(pick(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/))),
        pmcid: pick(/<ArticleId IdType="pmc">(PMC\d+)<\/ArticleId>/) || null,
        title: decode(pick(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)),
        abstract: abstractParts.join(" "),
        authors,
        journal: decode(pick(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/)),
        year: year ? Number(year) : null,
        language: pick(/<Language>(\w+)<\/Language>/) || null,
        pubTypes: [...b.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((x) => decode(x[1])),
        mesh: [...b.matchAll(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g)].map((x) => decode(x[1])),
        keywords: [...b.matchAll(/<Keyword[^>]*>([\s\S]*?)<\/Keyword>/g)].map((x) => decode(x[1])),
        source: "pubmed",
      });
    }
    process.stdout.write(`  pubmed ${Math.min(i + 150, ids.length)}/${ids.length}\r`);
  }
  console.log();
  return out;
}

// ---------------------------------------------------------------- OpenAlex
const rebuildAbstract = (inv) => {
  if (!inv) return "";
  const words = [];
  for (const [w, pos] of Object.entries(inv)) for (const p of pos) words[p] = w;
  return words.join(" ").replace(/\s+/g, " ").trim();
};
async function openalex() {
  const select = "id,doi,title,publication_year,type,language,authorships,primary_location,open_access,cited_by_count,abstract_inverted_index,ids,keywords,topics";
  const out = [];
  // Page-based paging (cursor paging needs an API key; page paging works keyless up to 10,000 results).
  let page = 1;
  while (page) {
    const j = await getJson(`https://api.openalex.org/works?filter=title_and_abstract.search:matcha&per-page=200&page=${page}&select=${select}&mailto=${MAILTO}${OA_KEY}`);
    for (const w of j.results) {
      const src = w.primary_location?.source;
      out.push({
        openalexId: w.id,
        doi: normDoi(w.doi),
        pmid: (w.ids?.pmid || "").replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, "").replace(/\/$/, "") || null,
        pmcid: (w.ids?.pmcid || "").match(/PMC\d+/)?.[0] || null,
        title: decode(w.title),
        abstract: rebuildAbstract(w.abstract_inverted_index),
        authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
        journal: src?.display_name || "",
        year: w.publication_year || null,
        language: w.language || null,
        oaType: w.type || null,
        isOa: !!w.open_access?.is_oa,
        oaUrl: w.open_access?.oa_url || null,
        citedBy: w.cited_by_count || 0,
        keywords: (w.keywords || []).map((k) => k.display_name).filter(Boolean),
        topicsOA: (w.topics || []).map((t) => t.display_name).filter(Boolean).slice(0, 4),
        source: "openalex",
      });
    }
    page = j.results.length === 200 && out.length < j.meta.count ? page + 1 : 0;
    process.stdout.write(`  openalex ${out.length}/${j.meta.count}\r`);
    await sleep(150);
  }
  console.log();
  return out;
}

// ---------------------------------------------------------------- Europe PMC
async function europepmc() {
  const out = [];
  let cursor = "*";
  for (let page = 0; page < 20; page++) {
    const j = await getJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent('(TITLE_ABS:"matcha" OR KW:"matcha")')}&format=json&resultType=core&pageSize=500&cursorMark=${encodeURIComponent(cursor)}`);
    for (const r of j.resultList?.result || []) {
      out.push({
        pmid: r.pmid || null,
        pmcid: r.pmcid || null,
        doi: normDoi(r.doi),
        title: decode(r.title),
        abstract: decode(r.abstractText),
        authors: (r.authorString || "").replace(/\.$/, "").split(/,\s*/).filter(Boolean),
        journal: r.journalInfo?.journal?.title || r.bookOrReportDetails?.publisher || "",
        year: r.pubYear ? Number(r.pubYear) : null,
        language: null,
        pubTypes: [].concat(r.pubTypeList?.pubType || []),
        isOa: r.isOpenAccess === "Y",
        citedBy: r.citedByCount || 0,
        keywords: (r.keywordList?.keyword || []).map(decode),
        mesh: (r.meshHeadingList?.meshHeading || []).map((m) => m.descriptorName).filter(Boolean),
        sourceType: r.source, // MED, PMC, PPR (preprint), AGR ...
        source: "europepmc",
      });
    }
    if (!j.nextCursorMark || j.nextCursorMark === cursor || !(j.resultList?.result || []).length) break;
    cursor = j.nextCursorMark;
    process.stdout.write(`  europepmc ${out.length}/${j.hitCount}\r`);
    await sleep(200);
  }
  console.log();
  return out;
}

// ---------------------------------------------------------------- classify
const TEA_CONTEXT = /(\btea\b|camellia|catechin|theanine|egcg|caffeine|polyphenol|tencha|gyokuro|sencha|shaded|uji\b|japan|green tea|chlorophyll|flavan|epigallo)/i;
const MATCHA = /\bmatcha\b/i;
const FOOD_STRICT = /(cake|cookie|ice cream|noodle|latte|dessert|beverage|yogh?urt|chocolate|caramel|bread|confection|food product|smoothie|milkshake|pastry|biscuit|candy|gelato|mochi|tiramisu)/i;
const TITLE_PRODUCT = /(powder|packag|beverage|drink|minuman|caf(e|é)|cake|cookie|latte|dessert|product|consum|purchase|intention|industry|market|brand|extract|nano|functionali[sz]ed|alzheimer|diet|health|tea ceremony|chasen|bowl)/i;
const TITLE_NOISE = /(kindle|[pdf]|t(é|e)l(é|e)chargement|matching|pluton|ascites|process book|reviews?|recenzje|t(é|e)l(é|e)charger|vd+.d+|carbonatite|mole|dream state|cena|price)/i;
const CS_NOISE = /(neural|graph neural|speech synthesis|text-to-speech|pre-?training|language model|deep learning|transformer|algorithm|dataset|benchmark|chart|knowledge graph|matching (problem|algorithm)|machine learning)/i;
const EDU_NOISE = /(pelatihan|pengembangan media|pembelajaran|literasi|students?' (learning|literacy)|entrepreneurship|portfolio|assignment|business plan)/i;

const DESIGN = [
  ["Systematic review / meta-analysis", /(systematic review|meta-?analys)/i, ["Meta-Analysis", "Systematic Review"]],
  ["Randomized controlled trial", /(random|placebo-controlled|double-blind|crossover|cross-over)/i, ["Randomized Controlled Trial"]],
  ["Clinical trial (non-randomized)", /(clinical trial|pilot study|open-label|single-arm|intervention study)/i, ["Clinical Trial"]],
  ["Review", /(\breview\b|overview|narrative review|state of the art|perspective)/i, ["Review"]],
  ["Observational (human)", /(cohort|cross-sectional|case-control|survey|questionnaire|epidemiolog|observational|consumers?)/i, ["Observational Study"]],
  ["Animal study", /(\bmice\b|\bmouse\b|\brats?\b|zebrafish|murine|in vivo|animals?\b|rodent|broiler|piglets?)/i, []],
  ["In vitro / cell study", /(in vitro|cell lines?|cultured cells|hepg2|caco-2|macrophage|cytotoxic)/i, []],
  ["Chemical / analytical", /(hplc|lc-ms|gc-ms|mass spectrometr|spectroscop|chromatograph|nmr|quantif|determination of|metabolomic|voc\b|volatile|authentication|adulteration|detection of)/i, []],
  ["Food science / processing", /(formulation|texture|rheolog|particle size|grinding|milling|stone mill|ball mill|extrusion|storage|shelf life|ice cream|noodle|bread|cookie|yogurt|beverage|emulsion|encapsulat|bakery)/i, []],
  ["Agronomy / cultivation", /(shading|shade[- ]grown|cultivar|cultivation|fertili[sz]|harvest|tencha|plantation|yield|soil|photosynthe|nitrogen|tea (plant|garden|field)|genotype)/i, []],
  ["Sensory / consumer", /(sensory|aroma|flavou?r|taste|panel|color|colour|consumer preference|acceptability|astringen)/i, []],
];
const TOPICS = [
  ["Cognition, mood and stress", /(cognit|attention|memory|anxiety|stress|mood|alertness|sleep|depress|brain|neuro|eeg|fatigue|executive function)/i],
  ["Metabolism and weight", /(obes|weight|adipos|glucose|insulin|diabet|lipid|cholesterol|metabol|energy expenditure|fat oxidation|exercise|endurance|sport)/i],
  ["Cardiovascular and blood pressure", /(cardio|blood pressure|hypertens|vascular|endothelial|arterial|heart)/i],
  ["Antioxidants and polyphenols", /(antioxid|catechin|egcg|polyphenol|flavonoid|flavan|radical|oxidative)/i],
  ["L-theanine and caffeine", /(theanine|caffeine|amino acid|glutamic)/i],
  ["Safety, contaminants and toxicity", /(heavy metals?|cadmium|arsenic|mercury|pesticide|contaminat|mycotoxin|radioactiv|cesium|caesium|fluoride|microplastic|aluminum|aluminium|xylene|toluene|toxicolog|toxicity of|safety (of|assessment|profile|evaluation|concern)|adverse (effect|event|reaction)s?|\blead (content|level|concentration|exposure|contamination))/i],
  ["Cancer", /(cancer|tumou?r|carcinoma|apoptosis|chemoprevent|anti-?proliferat)/i],
  ["Gut and microbiome", /(microbio|gut\b|intestin|probiotic|colitis|short-chain|digest)/i],
  ["Inflammation and immunity", /(inflamm|immun|cytokine|allerg|antiviral|virus|infection|antimicrob|antibacterial)/i],
  ["Skin, oral and dental", /(skin|dermat|wrinkle|oral|dental|periodont|caries|halitosis|teeth|hair)/i],
  ["Cultivation and shading", /(shading|shade[- ]grown|cultivar|cultivation|fertili[sz]|tencha|plantation|photosynthe|nitrogen|tea (plant|garden|field)|harvest)/i],
  ["Processing, milling and quality", /(grinding|milling|stone mill|particle size|powder|storage|shelf life|color|colour|chlorophyll|quality|steaming|drying)/i],
  ["Aroma, flavor and sensory", /(aroma|flavou?r|taste|sensory|volatile|umami|astringen|bitter|odor|odour)/i],
  ["Food products and applications", /(ice cream|noodle|bread|cookie|yogurt|dessert|chocolate|bakery|beverage|latte|food product|fortif|formulation)/i],
  ["Authenticity and analytical methods", /(authentic|adulterat|fraud|detection|determination|hplc|lc-ms|chromatograph|spectroscop|metabolomic|chemometric|nir\b|near-infrared)/i],
  ["Market, culture and sustainability", /(market|economic|consumption|trend|sustainab|history|cultur|tea ceremony|supply chain|carbon|life cycle)/i],
];

function classify(rec) {
  const text = `${rec.title} ${rec.abstract} ${(rec.keywords || []).join(" ")} ${(rec.mesh || []).join(" ")}`;
  const pt = rec.pubTypes || [];
  let design = null;
  // Animal work describes "randomly assigned" rats, which is not a human randomized trial: if the
  // text is about animals and never about people, it is an animal study unless it is a review.
  const body = `${rec.title} ${rec.abstract}`;
  const animals = /(\bmice\b|\bmouse\b|\brats?\b|zebrafish|murine|rodent|wistar|sprague|broiler|piglets?|\bbalb\/c)/i.test(body);
  const people = /(participants?|volunteers?|patients?|subjects|healthy (men|women|adults|young)|\badults\b|children|students|humans?\b|older people|women|\bmen\b)/i.test(body);
  const isReview = pt.some((p) => /^(Meta-Analysis|Systematic Review|Review)$/.test(p)) || /(systematic review|meta-?analys|\breview\b)/i.test(rec.title);
  if (animals && !people && !isReview) design = "Animal study";
  if (!design) for (const [name, re, ptypes] of DESIGN) {
    if (ptypes.some((p) => pt.includes(p))) { design = name; break; }
  }
  if (!design) for (const [name, re] of DESIGN) if (re.test(`${rec.title} ${rec.abstract}`)) { design = name; break; }
  const topics = TOPICS.filter(([, re]) => re.test(`${rec.title} ${(rec.keywords || []).join(" ")} ${(rec.mesh || []).join(" ")} ${rec.abstract}`)).map(([n]) => n);
  // keep the most specific few: topics matched in the TITLE/keywords come first
  const head = `${rec.title} ${(rec.keywords || []).join(" ")}`;
  // "Safety" is a claim, so it needs real support: named in the title, keywords or subject
  // terms, or repeated in the abstract (not one passing word in a product-development paper).
  const safety = TOPICS.find((t) => t[0].startsWith("Safety"))[1];
  const safetyIdx = topics.indexOf("Safety, contaminants and toxicity");
  if (safetyIdx >= 0 && !safety.test(`${head} ${(rec.mesh || []).join(" ")}`)) {
    const hits = (rec.abstract.match(new RegExp(safety.source, "gi")) || []).length;
    if (hits < 2) topics.splice(safetyIdx, 1);
  }
  topics.sort((a, b) => Number(TOPICS.find((t) => t[0] === b)[1].test(head)) - Number(TOPICS.find((t) => t[0] === a)[1].test(head)));
  const where = MATCHA.test(rec.title) ? "title" : MATCHA.test((rec.keywords || []).join(" ")) ? "keywords" : MATCHA.test(rec.abstract) ? "abstract" : MATCHA.test((rec.mesh || []).join(" ")) ? "subject terms" : null;
  // How central is matcha? "subject" = in the title or author keywords, or named 3+ times;
  // "studied" = named twice in the abstract; "mention" = named once, in passing.
  const mentions = (`${rec.title} ${rec.abstract} ${(rec.keywords || []).join(" ")}`.match(/\bmatcha\b/gi) || []).length;
  const relevance = where === "title" || where === "keywords" || mentions >= 3 ? "subject" : mentions === 2 ? "studied" : "mention";
  return { design: design || (rec.abstract ? "Other / not stated" : "Not classified (no abstract)"), topics: topics.slice(0, 4), matchaIn: where, mentions, relevance };
}

// ---------------------------------------------------------------- merge
async function main() {
  // --cached re-uses the last download (so the filter/tagging rules can be tuned without re-hitting the APIs)
  const CACHE = path.join(__dirname, "..", ".cache", "studies-raw.json");
  let pm, oa, ep;
  if (process.argv.includes("--cached") && fs.existsSync(CACHE)) {
    ({ pm, oa, ep } = JSON.parse(fs.readFileSync(CACHE, "utf8")));
  } else {
    [pm, oa, ep] = [await pubmed(), await openalex(), await europepmc()];
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify({ pm, oa, ep }));
  }
  console.log(`raw: pubmed ${pm.length}, openalex ${oa.length}, europepmc ${ep.length}`);

  const byKey = new Map();
  const keyOf = (r) => (r.doi ? `doi:${r.doi}` : r.pmid ? `pmid:${r.pmid}` : `t:${normTitle(r.title)}|${r.year}`);
  const alias = new Map(); // secondary key -> primary key
  function add(r) {
    const keys = [r.doi && `doi:${r.doi}`, r.pmid && `pmid:${r.pmid}`, r.pmcid && `pmc:${r.pmcid}`, `t:${normTitle(r.title)}|${r.year}`].filter(Boolean);
    let primary = keys.map((k) => alias.get(k)).find(Boolean);
    if (!primary) { primary = keyOf(r); byKey.set(primary, { ...r, sources: [r.source] }); }
    else {
      const cur = byKey.get(primary);
      cur.sources = [...new Set([...cur.sources, r.source])];
      for (const f of ["doi", "pmid", "pmcid", "journal", "year", "language", "oaUrl", "openalexId", "oaType", "sourceType"]) if (!cur[f] && r[f]) cur[f] = r[f];
      if ((r.abstract || "").length > (cur.abstract || "").length) cur.abstract = r.abstract;
      if (!cur.authors?.length && r.authors?.length) cur.authors = r.authors;
      cur.pubTypes = [...new Set([...(cur.pubTypes || []), ...(r.pubTypes || [])])];
      cur.mesh = [...new Set([...(cur.mesh || []), ...(r.mesh || [])])];
      cur.keywords = [...new Set([...(cur.keywords || []), ...(r.keywords || [])])];
      cur.topicsOA = [...new Set([...(cur.topicsOA || []), ...(r.topicsOA || [])])];
      cur.citedBy = Math.max(cur.citedBy || 0, r.citedBy || 0);
      cur.isOa = cur.isOa || r.isOa;
    }
    for (const k of keys) if (!alias.has(k)) alias.set(k, primary);
  }
  for (const r of [...pm, ...oa, ...ep]) if (r.title) add(r);
  console.log("unique after dedupe:", byKey.size);

  const included = [], excluded = [];
  for (const rec of byKey.values()) {
    const text = `${rec.title} ${rec.abstract} ${(rec.keywords || []).join(" ")} ${(rec.mesh || []).join(" ")}`;
    const cls = classify(rec);
    const head = `${rec.title} ${(rec.keywords || []).join(" ")}`;
    const scandi = rec.language && /^(sv|no|nb|nn|da|swe|nor|dan)$/i.test(rec.language) || /\b(och|att|som|f(ö|o)r|med|studie|kvalitativ|av|till|det|inte)\b.{0,80}\b(och|att|som|f(ö|o)r|med|studie|kvalitativ|av|till|det|inte)\b/i.test(`${rec.title} ${(rec.abstract || "").slice(0, 300)}`);
    const spam = (/zenodo/i.test(rec.journal || "") && /(slim|supplement|suplemento|buy|price|reviews?|t(é|e)l(é|e)charger|download|pdf)/i.test(rec.title)) || /(\[pdf\]|\[kindle\]|\[epub\]|t(é|e)l(é|e)charg|read online|free download|recenzje|opinie|gdzie kupi)/i.test(rec.title);
    const why = !cls.matchaIn ? "matcha not found in title/abstract/keywords/subject terms"
      : scandi && !TEA_CONTEXT.test(text) ? "non-English text where 'matcha' is the verb 'to match'"
      : spam ? "promotional / spam record"
      : CS_NOISE.test(text) && !TEA_CONTEXT.test(text) && !/(adulter|extract|powder|particle|milling|spectro|latte|beverage|quantif)/i.test(rec.title) ? "unrelated computing paper (a model named Matcha)"
      : !(TEA_CONTEXT.test(text) || FOOD_STRICT.test(`${rec.title} ${(rec.keywords || []).join(" ")}`) || (MATCHA.test(rec.title) && rec.title.trim().split(/s+/).length >= 3 && !TITLE_NOISE.test(rec.title))) ? "no tea or food context"
      : EDU_NOISE.test(`${rec.title} ${(rec.abstract || "").slice(0, 400)}`) && !TEA_CONTEXT.test(text) ? "unrelated coursework or business study"
      : null;
    (why ? excluded : included).push(why ? { ...rec, excludedBecause: why } : { ...rec, ...cls });
  }

  // stable ids
  const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, "utf8")) : {};
  let next = Math.max(0, ...Object.values(registry)) + 1;
  const idFor = (r) => {
    const keys = [r.doi && `doi:${r.doi}`, r.pmid && `pmid:${r.pmid}`, `t:${normTitle(r.title)}|${r.year}`].filter(Boolean);
    for (const k of keys) if (registry[k]) { for (const k2 of keys) registry[k2] ??= registry[k]; return registry[k]; }
    const id = next++;
    for (const k of keys) registry[k] = id;
    return id;
  };
  included.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title));
  const studies = included.map((r) => ({
    id: idFor(r),
    title: r.title,
    authors: r.authors || [],
    journal: r.journal || "",
    year: r.year,
    doi: r.doi || null,
    pmid: r.pmid || null,
    pmcid: r.pmcid || null,
    language: r.language || null,
    design: r.design, relevance: r.relevance, mentions: r.mentions,
    topics: r.topics,
    matchaIn: r.matchaIn,
    abstract: r.abstract || "",
    keywords: (r.keywords || []).slice(0, 12),
    mesh: (r.mesh || []).slice(0, 12),
    pubTypes: (r.pubTypes || []).filter((p) => !/Journal Article|Research Support/i.test(p)),
    isOa: !!r.isOa,
    oaUrl: r.oaUrl || null,
    citedBy: r.citedBy || 0,
    sources: r.sources,
    kind: r.sourceType === "PPR" ? "preprint" : /thesis|dissertation/i.test((r.oaType || "") + (r.journal || "")) ? "thesis" : /book|chapter/i.test(r.oaType || "") ? "book" : "article",
  }));
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: studies.length, studies }, null, 1));
  fs.writeFileSync(EXCLUDED, JSON.stringify(excluded.map((r) => ({ title: r.title, year: r.year, doi: r.doi, pmid: r.pmid, journal: r.journal, excludedBecause: r.excludedBecause })), null, 1));
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 1));

  const tally = (f) => Object.entries(studies.reduce((m, s) => ((f(s) || []).forEach?.((x) => (m[x] = (m[x] || 0) + 1)) ?? (m[f(s)] = (m[f(s)] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  console.log(`\nincluded ${studies.length}, excluded ${excluded.length}`);
  console.log("by design:", tally((s) => s.design).map(([k, v]) => `${k} ${v}`).join(" | "));
  console.log("by topic:", tally((s) => s.topics).map(([k, v]) => `${k} ${v}`).join(" | "));
  console.log("by kind:", tally((s) => s.kind).map(([k, v]) => `${k} ${v}`).join(" | "));
  console.log("matcha in title:", studies.filter((s) => s.matchaIn === "title").length, "| with abstract:", studies.filter((s) => s.abstract).length, "| open access:", studies.filter((s) => s.isOa).length, "| with DOI:", studies.filter((s) => s.doi).length, "| PMID:", studies.filter((s) => s.pmid).length);
}
main().catch((e) => { console.error(e); process.exit(1); });
