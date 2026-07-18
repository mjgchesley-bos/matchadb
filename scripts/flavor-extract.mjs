// Extracts a discrete, filterable set of flavor/texture tags from the
// consolidated tasting_notes field (see taste-extract.mjs), grounded in a
// word-frequency pass over this dataset's actual tasting notes rather than
// a generic matcha-vocabulary guess.
//
// Bitter/astringent get stricter negation handling than every other tag:
// almost every mention of them in this dataset is a mitigation ("almost no
// astringency," "little bitterness," "faint trace of bitterness") -- nobody
// markets matcha as bitter. A mild qualifier here ("slight," "subtle,"
// "hint of") still means "notably not bitter" for someone filtering by
// flavor, not "somewhat bitter." Every other tag only excludes on a strong,
// unambiguous negation ("no," "not," "without") -- a mild qualifier there
// ("slight sweetness") still means the trait is genuinely present.

export const FLAVOR_TAGS = [
  { tag: "Sweet", keywords: ["sweet", "sweetness"] },
  { tag: "Umami", keywords: ["umami", "savory", "savoury", "brothy"] },
  { tag: "Grassy", keywords: ["grassy", "vegetal", "grassiness"] },
  { tag: "Earthy", keywords: ["earthy", "earthiness"] },
  { tag: "Nutty", keywords: ["nutty"] },
  { tag: "Floral", keywords: ["floral"] },
  { tag: "Fruity", keywords: ["fruity", "citrus"] },
  { tag: "Chocolatey", keywords: ["chocolate", "chocolatey", "cocoa", "cacao"] },
  { tag: "Roasted", keywords: ["roasted", "toasted"] },
  { tag: "Marine", keywords: ["oceanic", "marine", "seaweed", "kombu", "nori"] },
  { tag: "Creamy", keywords: ["creamy", "velvety", "buttery"] },
  { tag: "Smooth", keywords: ["smooth", "silky"] },
  { tag: "Rich", keywords: ["rich", "robust", "bold", "intense", "full-bodied"] },
  { tag: "Delicate", keywords: ["delicate", "subtle", "mild", "light"] },
  { tag: "Bitter", keywords: ["bitter", "bitterness"], strictNegation: true },
  { tag: "Astringent", keywords: ["astringent", "astringency"], strictNegation: true },
];

const STRONG_NEGATION = [
  "no",
  "not",
  "none",
  "never",
  "without",
  "lacking",
  "lack of",
  "zero",
  "free of",
  "free from",
  "devoid of",
];
const MILD_QUALIFIERS = [
  "slight",
  "slightly",
  "subtle",
  "faint",
  "faintly",
  "hint of",
  "hints of",
  "whisper of",
  "trace of",
  "traces of",
  "little",
  "minimal",
  "barely",
  "almost no",
  "hardly any",
  "touch of",
  "mild",
  "mildly",
  "light",
  "lightly",
  "delicate",
  "gentle",
  "low in",
];

// Looks at a window of text immediately before a keyword match for a
// negation/mitigation cue. `strict` also treats mild qualifiers as
// disqualifying (see module comment for why bitter/astringent need this).
//
// Word-boundary matching, not plain .includes() -- a naive substring check
// found "not" inside "Tasting **Not**es:", the label this module's own
// caller (taste-extract.mjs) prefixes onto every entry, which meant nearly
// every tag on nearly every product was spuriously "negated" by the
// consolidation function's own labeling. Caught by testing a known example
// (Asahi's "Exceptional sweetness and creamy umami" silently lost Sweet,
// Umami, and Creamy) before this shipped.
function isNegated(text, matchIndex, strict) {
  const windowStart = Math.max(0, matchIndex - 40);
  const before = text.slice(windowStart, matchIndex).toLowerCase();
  const cues = strict ? [...STRONG_NEGATION, ...MILD_QUALIFIERS] : STRONG_NEGATION;
  return cues.some((cue) => {
    const escaped = cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
    return re.test(before);
  });
}

export function extractFlavorTags(tastingNotes) {
  if (!tastingNotes) return [];
  const lower = tastingNotes.toLowerCase();
  const tags = [];
  for (const { tag, keywords, strictNegation } of FLAVOR_TAGS) {
    let matched = false;
    let anyNegated = false;
    for (const kw of keywords) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "giu");
      let m;
      while ((m = re.exec(lower)) !== null) {
        if (isNegated(lower, m.index, !!strictNegation)) {
          anyNegated = true;
        } else {
          matched = true;
        }
      }
    }
    // If every occurrence of this tag's keywords was negated/mitigated and
    // none were affirmed, don't tag it -- but if even one affirmed mention
    // exists (e.g. one review says "umami" plainly even if another hedges),
    // include it.
    if (matched) tags.push(tag);
    else if (anyNegated) {
      // fully negated -- explicitly not tagged, nothing to do
    }
  }
  return tags;
}
