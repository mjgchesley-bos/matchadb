import type { ComparablePrice } from "./db";
import { REGION_CONTENT } from "./region-content";

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

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function pct(share: number): number {
  return Math.min(99, Math.max(1, Math.round(share * 100)));
}

function relationToMedian(price: number, med: number, noun: string): string {
  const ratio = price / med;
  if (ratio >= 1.5) return `roughly ${ratio.toFixed(1)}× the ${noun} median`;
  if (ratio <= 0.67) return `well under the ${noun} median`;
  if (ratio > 1.15) return `above the ${noun} median`;
  if (ratio < 0.85) return `below the ${noun} median`;
  return `close to the ${noun} median`;
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
  all: ComparablePrice[]
): PriceInsight | null {
  const target = all.find((p) => p.id === productId);
  if (!target) return null;
  const others = all.filter((p) => p.id !== productId);
  if (others.length < MIN_GRADE_PEERS) return null;

  const t = target.pricePerGram;
  const moreThan = others.filter((o) => o.pricePerGram < t).length / others.length;
  const lessThan = others.filter((o) => o.pricePerGram > t).length / others.length;

  const sentences: string[] = [];
  let shortClause: string;
  if (moreThan >= 0.5) {
    sentences.push(
      `At ${usd(t)} per gram, it costs more than ${pct(moreThan)}% of the other ${others.length} matchas in the database with a confirmed price and size.`
    );
    shortClause = `${usd(t)}/g, pricier than ${pct(moreThan)}% of matchas`;
  } else {
    sentences.push(
      `At ${usd(t)} per gram, it costs less than ${pct(lessThan)}% of the other ${others.length} matchas in the database with a confirmed price and size.`
    );
    shortClause = `${usd(t)}/g, cheaper than ${pct(lessThan)}% of matchas`;
  }

  // Region comparison (preferred), else grade.
  let regionSlug: string | null = null;
  const regionPeers = target.region
    ? all.filter((p) => p.region === target.region)
    : [];
  if (target.region && regionPeers.length >= MIN_REGION_PEERS) {
    const med = median(regionPeers.map((p) => p.pricePerGram).sort((a, b) => a - b));
    sentences.push(
      `Among the ${regionPeers.length} ${target.region} matchas with a confirmed price, the median is ${usd(med)} per gram, and this one is ${relationToMedian(t, med, "regional")}.`
    );
    regionSlug = REGION_CONTENT[target.region]?.slug ?? null;
  } else if (target.grade) {
    const gradePeers = all.filter((p) => p.grade === target.grade);
    if (gradePeers.length >= MIN_GRADE_PEERS) {
      const med = median(gradePeers.map((p) => p.pricePerGram).sort((a, b) => a - b));
      sentences.push(
        `Among the ${gradePeers.length} ${target.grade.toLowerCase()}-grade matchas with a confirmed price, the median is ${usd(med)} per gram, and this one is ${relationToMedian(t, med, "grade")}.`
      );
    }
  }

  // Position within its own brand.
  const brandPeers = all
    .filter((p) => p.brand === target.brand)
    .sort((a, b) => a.pricePerGram - b.pricePerGram);
  if (brandPeers.length >= MIN_BRAND_PEERS) {
    const rank = brandPeers.findIndex((p) => p.id === productId) + 1;
    const brandPoss = /s$/i.test(target.brand) ? `${target.brand}'` : `${target.brand}'s`;
    const where =
      rank === 1
        ? `its cheapest`
        : rank === brandPeers.length
          ? `its most expensive`
          : `the ${ordinal(rank)}-cheapest`;
    sentences.push(
      `Among ${brandPoss} ${brandPeers.length} matchas with a confirmed price, this is ${where} per gram.`
    );
  }

  return { pricePerGram: t, sentences, basis: others.length + 1, shortClause, regionSlug };
}

export type BrandSummaryInput = {
  brand: string;
  products: { region: string | null; grade: string | null; organic_certified: number }[];
  comparable: ComparablePrice[]; // this brand's comparable-price products
};

export function getBrandSummary({ brand, products, comparable }: BrandSummaryInput): string[] {
  const n = products.length;
  const out: string[] = [];

  const gradeCounts = new Map<string, number>();
  for (const p of products) if (p.grade) gradeCounts.set(p.grade, (gradeCounts.get(p.grade) ?? 0) + 1);
  const topGrade = [...gradeCounts].sort((a, b) => b[1] - a[1])[0];
  const graded = [...gradeCounts.values()].reduce((a, b) => a + b, 0);
  let first = `${brand} has ${n} matcha product${n === 1 ? "" : "s"} in our database`;
  if (topGrade && graded >= 3) {
    first += topGrade[1] / graded >= 0.5
      ? `, mostly ${topGrade[0].toLowerCase()} grade.`
      : `, spanning ${gradeCounts.size} grades.`;
  } else {
    first += ".";
  }
  out.push(first);

  const regionCounts = new Map<string, number>();
  for (const p of products) if (p.region) regionCounts.set(p.region, (regionCounts.get(p.region) ?? 0) + 1);
  const regions = [...regionCounts].sort((a, b) => b[1] - a[1]);
  if (regions.length > 0) {
    const shown = regions.slice(0, 3).map(([r, c]) => `${r} (${c})`).join(", ");
    out.push(
      `Growing regions it discloses: ${shown}${regions.length > 3 ? `, and ${regions.length - 3} more` : ""}.`
    );
  }

  if (comparable.length >= 3) {
    const sorted = comparable.map((c) => c.pricePerGram).sort((a, b) => a - b);
    out.push(
      `Across ${comparable.length} products with a confirmed price and size, cost runs from ${usd(sorted[0])} to ${usd(sorted[sorted.length - 1])} per gram, with a median of ${usd(median(sorted))}.`
    );
  }
  return out;
}
