// Shared grade/cultivar/region keyword lists and matcher, used by both
// build-db.mjs (extracting from archived research text) and
// scrape-live-attributes.mjs (extracting from the live product page) --
// kept in one place so the two extraction paths can never drift out of
// sync with each other.

// "premium" deliberately excluded: it's generic marketing language ("crafted
// from premium first-harvest Japanese tea"), not a real matcha grade
// classification the way ceremonial/culinary/koicha/usucha are -- confirmed
// as a live false-positive source (Chamberlain Coffee's Vanilla Matcha) and
// also collided as a plain substring of Breakaway's "Hyperpremium" tier
// name, which is Breakaway's own proprietary naming, not the formal
// "Premium" grade. Removing it corrected 61 products that were already
// shipping with a wrong grade="Premium" from the archived-text extraction.
export const GRADE_KEYWORDS = ["ceremonial", "culinary", "koicha", "usucha", "latte grade", "food grade"];

export const CULTIVAR_KEYWORDS = [
  "yabukita", "samidori", "okumidori", "saemidori", "asahi", "gokou", "gokō", "uji hikari",
  "tsuyuhikari", "kanaya midori", "yutakamidori", "sae akari", "zairai", "narino",
];

export const REGION_KEYWORDS = [
  "uji", "nishio", "kagoshima", "shizuoka", "kyoto", "yame", "wazuka", "shirakawa",
  "kyushu", "nara", "kakegawa", "aichi", "miyazaki", "china", "taiwan", "korea", "vietnam",
];

// Word-boundary match, not a plain substring -- a plain .includes() would
// match "uji" (a region keyword) inside an unrelated word like "Fuji". Uses
// Unicode-aware lookaround boundaries rather than \b: JS's plain \b treats
// only ASCII [A-Za-z0-9_] as "word" characters, so it silently fails to
// match accented cultivar names like "gokō" (the macron isn't a \w char,
// breaking the trailing boundary) -- caught by testing this change against
// real cultivar keywords before shipping it.
export function findFirstKeyword(haystackLower, keywords) {
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
    if (re.test(haystackLower)) return kw;
  }
  return null;
}
