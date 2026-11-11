// MatchaDB does not publish health claims. Product data comes from each brand's own pages, and brands
// (rightly or not) write health and "benefit" copy there. We keep the facts (grade, region, price, size,
// tasting description, caffeine amounts the brand states) and drop the rest before anything reaches a page.
// Used on the product page for the "Full details" box, the research notes and the tasting notes.

const TERMS = [
  "health\\w*", "wellness", "well-?being", "benefits", "beneficial", "antioxidant\\w*", "anti-?inflammat\\w*", "inflammat\\w*", "detox\\w*", "cleans\\w*", "toxin\\w*",
  "immun\\w+", "cholesterol", "blood (?:sugar|pressure)", "cancer", "diabet\\w*", "cardio\\w*", "brain", "cognit\\w*", "memory", "concentration",
  "focus(?:ed)?(?!\\s+on\\b)", "alert(?:ness)?", "calm\\w*", "relax(?:ing|ation|ed)?", "stress\\w*", "anxi\\w*", "sleep\\w*", "mood", "energ\\w*", "boost\\w*",
  "metabolis\\w*", "weight (?:loss|management)", "healthy weight", "fat[- ]burn\\w*", "longevity", "anti-?aging", "skin", "hair", "glow\\w*", "superfood",
  "nutrient\\w*", "nutrition\\w*", "vitamin\\w*", "nourish\\w*", "heal\\w*", "therap\\w*", "prevent\\w*", "cure\\w*", "digest\\w*", "gut", "hormon\\w*",
  "circulat\\w*", "jitter\\w*", "crash", "theanine", "egcg", "catechin\\w*", "polyphenol\\w*", "chlorophyll", "amino acid\\w*", "flavonoid\\w*", "clinical\\w*",
  "science-backed", "proven",
];
const HEALTH_RE = new RegExp(`\\b(?:${TERMS.join("|")})\\b`, "gi");
// "Nutrient-rich volcanic soil" or "a nutrient-denser fertilizer" describe the farm, not the cup. The nutrition word must sit
// right next to soil or fertilizer, so "preserving flavor and nutrients all the way to your cup" is still dropped.
const SOIL_WORDS = /\b(?:nutrient|nutrition)\w*/i;
const FARM_CONTEXT = /\b(?:nutrient|nutrition)\w*\b[^.;]{0,30}\b(?:soils?|fertili[sz]\w*)\b|\b(?:soils?|fertili[sz]\w*)\b[^.;]{0,30}\b(?:nutrient|nutrition)\w*/i;

export function isHealthText(s: string): boolean {
  const hits = s.match(HEALTH_RE);
  if (!hits) return false;
  if (hits.every((h) => SOIL_WORDS.test(h)) && FARM_CONTEXT.test(s)) return false;
  return true;
}

/** Keeps the sentences without health language; returns "" when nothing is left. */
export function stripHealth(text: string): string {
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !isHealthText(p))
    .join(" ")
    .trim();
}

/** Same for a field value of any shape (text, list, nested fields); null when nothing is left. */
export function sanitizeValue(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "string") return stripHealth(v) || null;
  if (Array.isArray(v)) {
    const out = v.map(sanitizeValue).filter((x) => x != null && x !== "");
    return out.length ? out : null;
  }
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const y = sanitizeValue(x);
      if (y != null && y !== "") out[k] = y;
    }
    return Object.keys(out).length ? out : null;
  }
  return v;
}

// Field names that are health or nutrition claims by definition, plus a vague level the brands rate themselves.
// (A nutrition-facts panel with calories, fat and sugar is plain label data the company states, so it stays.)
const HIDDEN_KEYS = /health|benefit|nutritional_(?:claim|component|value|highlight)|wellness|fda|compound|antioxid|marketing_claims|marketed|caffeine_level|energy/i;
export const isHealthKey = (key: string): boolean => HIDDEN_KEYS.test(key);
