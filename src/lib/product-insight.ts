import type { ComparablePrice } from "./db";
import { REGION_CONTENT } from "./region-content";
import { usd30 } from "./unit-price";
import type { TFn, TVFn } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

// "Price in context": plain-English comparisons computed from the database,
// so each product page carries information that exists nowhere else (not on
// the brand's own page) and that is unique to that product. Every claim here
// is derived from numbers, never written by hand, and only appears when there
// are enough comparable products for it to mean something.
const MIN_REGION_PEERS = 5;
const MIN_GRADE_PEERS = 10;
const MIN_BRAND_PEERS = 3;

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function pct(share: number): number {
  return Math.min(99, Math.max(1, Math.round(share * 100)));
}

function relationToMedian(t: TFn, price: number, medPrice: number, noun: "region" | "grade"): string {
  const ratio = price / medPrice;
  const med = t(noun === "region" ? "ins.med.region" : "ins.med.grade");
  if (ratio >= 1.5) return t("ins.rel.x", { x: ratio.toFixed(1), med });
  if (ratio <= 0.67) return t("ins.rel.well", { med });
  if (ratio > 1.15) return t("ins.rel.above", { med });
  if (ratio < 0.85) return t("ins.rel.below", { med });
  return t("ins.rel.close", { med });
}

export type PriceInsight = {
  pricePerGram: number;
  // Paragraph shown on the page.
  sentences: string[];
  // How many products the overall comparison is based on.
  basis: number;
  // One short clause for meta descriptions, e.g. "$3.25/g, pricier than 91% of matchas".
  shortClause: string;
  regionSlug: string | null;
};

export function getPriceInsight(
  productId: number,
  all: ComparablePrice[],
  lang: Locale,
  t: TFn,
  tv: TVFn
): PriceInsight | null {
  const target = all.find((p) => p.id === productId);
  if (!target) return null;
  const others = all.filter((p) => p.id !== productId);
  if (others.length < MIN_GRADE_PEERS) return null;

  const tp = target.pricePerGram;
  const tr = t;
  const moreThan = others.filter((o) => o.pricePerGram < tp).length / others.length;
  const lessThan = others.filter((o) => o.pricePerGram > tp).length / others.length;

  const sentences: string[] = [];
  let shortClause: string;
  if (moreThan >= 0.5) {
    sentences.push(tr("ins.more", { price: usd30(tp), pct: pct(moreThan), n: others.length }));
    shortClause = tr("ins.short.more", { price: usd30(tp), pct: pct(moreThan) });
  } else {
    sentences.push(tr("ins.less", { price: usd30(tp), pct: pct(lessThan), n: others.length }));
    shortClause = tr("ins.short.less", { price: usd30(tp), pct: pct(lessThan) });
  }

  // Region comparison (preferred), else grade.
  let regionSlug: string | null = null;
  const regionPeers = target.region
    ? all.filter((p) => p.region === target.region)
    : [];
  if (target.region && regionPeers.length >= MIN_REGION_PEERS) {
    const med = median(regionPeers.map((p) => p.pricePerGram).sort((a, b) => a - b));
    sentences.push(
      tr("ins.region", { n: regionPeers.length, region: tv("region", target.region), median: usd30(med), relation: relationToMedian(tr, tp, med, "region") })
    );
    regionSlug = REGION_CONTENT[target.region]?.slug ?? null;
  } else if (target.grade) {
    const gradePeers = all.filter((p) => p.grade === target.grade);
    if (gradePeers.length >= MIN_GRADE_PEERS) {
      const med = median(gradePeers.map((p) => p.pricePerGram).sort((a, b) => a - b));
      sentences.push(
        tr("ins.grade", {
          n: gradePeers.length,
          grade: lang === "en" ? target.grade.toLowerCase() : tv("grade", target.grade),
          median: usd30(med),
          relation: relationToMedian(tr, tp, med, "grade"),
        })
      );
    }
  }

  // Position within its own brand.
  const brandPeers = all
    .filter((p) => p.brand === target.brand)
    .sort((a, b) => a.pricePerGram - b.pricePerGram);
  if (brandPeers.length >= MIN_BRAND_PEERS) {
    const rank = brandPeers.findIndex((p) => p.id === productId) + 1;
    const where =
      rank === 1
        ? tr("ins.where.cheapest")
        : rank === brandPeers.length
          ? tr("ins.where.priciest")
          : tr("ins.where.nth", { ord: lang === "en" ? ordinal(rank) : String(rank) });
    const key = lang === "en" && /s$/i.test(target.brand) ? "ins.brand.s" : "ins.brand";
    sentences.push(tr(key, { brand: target.brand, n: brandPeers.length, where }));
  }

  return { pricePerGram: tp, sentences, basis: others.length + 1, shortClause, regionSlug };
}

export type BrandSummaryInput = {
  brand: string;
  products: { region: string | null; grade: string | null; organic_certified: number }[];
  comparable: ComparablePrice[]; // this brand's comparable-price products
};

export function getBrandSummary({ brand, products, comparable }: BrandSummaryInput, lang: Locale, t: TFn, tv: TVFn): string[] {
  const n = products.length;
  const out: string[] = [];

  const gradeCounts = new Map<string, number>();
  for (const p of products) if (p.grade) gradeCounts.set(p.grade, (gradeCounts.get(p.grade) ?? 0) + 1);
  const topGrade = [...gradeCounts].sort((a, b) => b[1] - a[1])[0];
  const graded = [...gradeCounts.values()].reduce((a, b) => a + b, 0);
  let first: string;
  if (topGrade && graded >= 3) {
    first =
      topGrade[1] / graded >= 0.5
        ? t("bs.b", { brand, n, grade: lang === "en" ? topGrade[0].toLowerCase() : tv("grade", topGrade[0]) })
        : t("bs.c", { brand, n, g: gradeCounts.size });
  } else {
    first = t(n === 1 ? "bs.a.one" : "bs.a.other", { brand, n });
  }
  out.push(first);

  const regionCounts = new Map<string, number>();
  for (const p of products) if (p.region) regionCounts.set(p.region, (regionCounts.get(p.region) ?? 0) + 1);
  const regions = [...regionCounts].sort((a, b) => b[1] - a[1]);
  if (regions.length > 0) {
    const shown = regions.slice(0, 3).map(([r, c]) => `${tv("region", r)} (${c})`).join(lang === "ja" || lang === "zh" ? "、" : ", ");
    out.push(regions.length > 3 ? t("bs.regions.more", { list: shown, n: regions.length - 3 }) : t("bs.regions", { list: shown }));
  }

  if (comparable.length >= 3) {
    const sorted = comparable.map((c) => c.pricePerGram).sort((a, b) => a - b);
    out.push(t("bs.price", { n: comparable.length, lo: usd30(sorted[0]), hi: usd30(sorted[sorted.length - 1]), med: usd30(median(sorted)) }));
  }
  return out;
}
