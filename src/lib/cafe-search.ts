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
function lev(a: string, b: string, max: number): number {
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

/**
 * How well a normalized query matches a normalized café name. >= 1 means the query is inside the name
 * (1.2 identical, 1.1 name starts with it, 1.0 contained); below 1 is a typo-tolerant similarity (0..0.95).
 */
export function nameScore(q: string, n: string): number {
  if (!q || !n) return 0;
  if (n === q) return 1.2;
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
