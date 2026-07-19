// Extracts a discrete "use" facet (Tea, Lattes, Culinary) from the full
// disclosed_json blob plus the grade column -- NOT from tasting_notes.
// Checked before building: 506 of 728 products have use-case signal only in
// disclosed_json (or both), vs just 3 in tasting_notes alone. Use-case info
// lives in fields taste-extract.mjs deliberately excludes (usage
// suggestions, brewing instructions, product descriptions), so this reuses
// the whole disclosed blob rather than the taste-only consolidated field.
//
// Keywords were checked against real occurrences before inclusion. Notably
// excluded: bare "bake"/"cook" roots -- "Bakers Chocolate" (a flavor tag,
// not a baking-use signal) and "maker"/"shaker"/"home cooks" fields are
// common in this dataset and would have been false-positive sources; the
// suffixed forms ("baking", "cooking") don't have this collision.
export const USE_TAGS = [
  {
    tag: "Tea",
    keywords: ["ceremonial", "whisk", "whisking", "usucha", "koicha"],
    grades: ["Ceremonial", "Usucha", "Koicha"],
  },
  {
    tag: "Lattes",
    keywords: ["latte", "lattes", "iced", "smoothie", "smoothies", "frappe", "cocktail", "cocktails"],
    grades: ["Latte grade"],
  },
  {
    tag: "Culinary",
    keywords: ["culinary", "baking", "cooking", "recipe", "recipes", "dessert", "desserts", "ice cream", "mochi"],
    grades: ["Culinary"],
  },
];

// "than" catches comparative framing like "stronger tea flavor than
// ceremonial grade" -- a culinary-grade product contrasting itself against
// ceremonial grade, not claiming ceremonial/tea suitability. Found via a
// real example (id 4, "Culinary Grade Matcha") during verification.
const STRONG_NEGATION = ["no", "not", "none", "never", "without", "isn't", "aren't", "than"];

function isNegated(text, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 40);
  const before = text.slice(windowStart, matchIndex).toLowerCase();
  return STRONG_NEGATION.some((cue) => {
    const escaped = cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
    return re.test(before);
  });
}

export function extractUseTags(disclosed, grade) {
  const text = (JSON.stringify(disclosed || {}) + " " + (grade || "")).toLowerCase();
  const tags = [];
  for (const { tag, keywords, grades } of USE_TAGS) {
    if (grade && grades.includes(grade)) {
      tags.push(tag);
      continue;
    }
    let matched = false;
    for (const kw of keywords) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "giu");
      let m;
      while ((m = re.exec(text)) !== null) {
        if (!isNegated(text, m.index)) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (matched) tags.push(tag);
  }
  return tags;
}
