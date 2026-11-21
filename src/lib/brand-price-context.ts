// Where a brand sits among all brands on price, computed only from the comparable
// (seller-stated size, reviewed) prices already in the database. English-page helper.
import type { ComparablePrice } from "./db";

const med = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type GradeCtx = { grade: string; brandMedian: number; allMedian: number; brandN: number; allN: number };
export type BrandPriceContext = {
  brandMedian: number;
  allMedian: number;
  rank: number; // 1 = cheapest
  of: number; // brands with 2+ comparable products
  pctCheaperThan: number; // share of ranked brands this one is cheaper than, 0-100
  grades: GradeCtx[];
  n: number;
};

export function brandPriceContext(brand: string, all: ComparablePrice[]): BrandPriceContext | null {
  const mine = all.filter((c) => c.brand === brand);
  if (mine.length < 2) return null;
  const by = new Map<string, number[]>();
  for (const c of all) by.set(c.brand, [...(by.get(c.brand) ?? []), c.pricePerGram]);
  const ranked = [...by.entries()].filter(([, v]) => v.length >= 2).map(([b, v]) => ({ b, m: med(v) })).sort((a, b) => a.m - b.m);
  const idx = ranked.findIndex((r) => r.b === brand);
  if (idx < 0 || ranked.length < 10) return null;
  const brandMedian = ranked[idx].m;
  const grades: GradeCtx[] = [];
  for (const g of new Set(mine.map((c) => c.grade).filter((g): g is string => !!g))) {
    const bm = mine.filter((c) => c.grade === g).map((c) => c.pricePerGram);
    const am = all.filter((c) => c.grade === g).map((c) => c.pricePerGram);
    if (am.length >= 8) grades.push({ grade: g, brandMedian: med(bm), allMedian: med(am), brandN: bm.length, allN: am.length });
  }
  grades.sort((a, b) => b.brandN - a.brandN);
  return { brandMedian, allMedian: med(all.map((c) => c.pricePerGram)), rank: idx + 1, of: ranked.length, pctCheaperThan: Math.round(((ranked.length - 1 - idx) / (ranked.length - 1)) * 100), grades: grades.slice(0, 4), n: mine.length };
}
