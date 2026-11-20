// Matching for the one search bar on the café finder: café names (typos allowed) alongside places.

/** Lower-case, accents and punctuation removed, single spaces: "Café  Nº1!" -> "cafe n 1". */
export const norm = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Levenshtein distance, giving up (returning max + 1) once it is certain to exceed `max`. */
export function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well one typed word matches one word: 1 exact, .9 starts with, .7 inside, .6 a typo away, else 0. */
export function wordScore(q: string, w: string): number {
  if (q === w) return 1;
  if (w.startsWith(q)) return q.length >= 2 ? 0.9 : 0;
  if (q.length >= 3 && w.includes(q)) return 0.7;
  if (q.length >= 4 && w.length >= 4) {
    const max = q.length >= 8 ? 2 : 1;
    if (lev(q, w, max) <= max) return 0.6;
  }
  return 0;
}

/**
 * "kettl brooklyn": every typed word has to match a word of the café's name or its place (city, state, country), and at least one has to
 * match the name, so a pure place query is left to the place search. 0 = no match, otherwise the mean of the words' best scores.
 */
export function namePlaceScore(tokens: string[], nameWords: string[], placeWords: string[]): number {
  let sum = 0;
  let inName = false;
  for (const q of tokens) {
    let bn = 0;
    for (const w of nameWords) bn = Math.max(bn, wordScore(q, w));
    let bp = 0;
    for (const w of placeWords) bp = Math.max(bp, wordScore(q, w));
    const best = Math.max(bn, bp);
    if (best < 0.6) return 0;
    if (bn >= 0.7) inName = true;
    sum += best;
  }
  return inName ? sum / tokens.length : 0;
}

/**
 * How well a normalized query matches a normalized café name. >= 1 means the query is inside the name
 * (1.2 identical, 1.15 as whole words, 1.1 name starts with it, 1.0 contained); below 1 is a typo-tolerant similarity (0..0.95).
 */
export function nameScore(q: string, n: string): number {
  if (!q || !n) return 0;
  if (n === q) return 1.2;
  if ((" " + n + " ").includes(" " + q + " ")) return 1.15; // the typed word(s) as whole words: "kettl" is Kettl Greenpoint before Kettle On Main
  if (n.startsWith(q)) return 1.1;
  if (n.includes(q)) return 1.0;
  if (q.length < 4) return 0;
  const words = n.split(" ");
  const qw = q.split(" ").length;
  let best = 0;
  for (let i = 0; i + qw <= words.length; i++) {
    const w = words.slice(i, i + qw).join(" ");
    const m = Math.max(q.length, w.length);
    best = Math.max(best, 1 - lev(q, w, Math.ceil(m * 0.4)) / m);
  }
  const m = Math.max(q.length, n.length);
  best = Math.max(best, 1 - lev(q, n, Math.ceil(m * 0.4)) / m);
  return Math.max(0, best) * 0.95;
}
