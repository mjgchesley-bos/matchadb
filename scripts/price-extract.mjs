// Extracts (grams, price, currency) pairs from a product's free-form "disclosed"
// research data, then picks the smallest offered size as the canonical price.
// Deliberately conservative: if it can't find a confident, unambiguous pair,
// it returns null rather than guessing — those get flagged for manual review.

const PRICE_KEY_RE = /price|cost|size|sku|variant|pricing|weight|count/i;
// Brewing/prep amounts (water volume, spoon measures) get swept up by the
// generic "size" keyword match but are NOT retail package sizes — excluding
// them from weight extraction specifically (they can still be scanned for
// amounts, which they never actually contain).
const SERVING_AMOUNT_KEY_RE = /serving[_\s]?size|serving[_\s]?amount|serving[_\s]?guidance/i;
const DIRECT_PRICE_KEY_RE = /^price(_usd)?$|_price$|^cost$|^price_usd$/i;

const WEIGHT_RE = /(\d+(?:\.\d+)?)\s?(kg|kilograms?|g\b|grams?|gram|oz\b|ounces?|lbs?\b|pounds?)\b/gi;
const USD_RE = /(?:US\$|USD\s?\$?|\$)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const JPY_RE = /(?:¥|JPY\s?|yen\s?)\s?([\d,]+)|([\d,]+)\s?(?:yen|¥|JPY)/gi;

function unitToGrams(value, unit) {
  const u = unit.toLowerCase();
  if (u.startsWith("kg") || u.startsWith("kilo")) return value * 1000;
  if (u.startsWith("lb") || u.startsWith("pound")) return value * 453.592;
  if (u.startsWith("oz") || u.startsWith("ounce")) return value * 28.3495;
  return value; // grams
}

function findWeights(text) {
  const out = [];
  let m;
  const re = new RegExp(WEIGHT_RE.source, "gi");
  while ((m = re.exec(text))) {
    out.push({ index: m.index, grams: unitToGrams(parseFloat(m[1]), m[2]) });
  }
  return out;
}

function findAmounts(text) {
  const out = [];
  let m;
  const usd = new RegExp(USD_RE.source, "gi");
  while ((m = usd.exec(text))) {
    out.push({ index: m.index, amount: parseFloat(m[1].replace(/,/g, "")), currency: "USD" });
  }
  const jpy = new RegExp(JPY_RE.source, "gi");
  while ((m = jpy.exec(text))) {
    const raw = m[1] || m[2];
    if (raw) out.push({ index: m.index, amount: parseFloat(raw.replace(/,/g, "")), currency: "JPY" });
  }
  return out;
}

// Processes one "blob" (a single key's flattened text, or a single array item's
// flattened text). Splits on segment delimiters first (";", "|") so that
// strings like "$26.00 (30g); $49.00 (80g)" pair each price with the weight in
// its OWN segment, rather than whichever weight happens to be fewer characters
// away in the raw string (which gets the wrong answer when multiple
// price/size pairs are packed into one string). Amounts/weights that don't
// find an in-segment partner are returned separately so the caller can attempt
// a product-wide fallback pairing.
function processBlob(text) {
  const segments = text.split(/;/);
  const paired = [];
  const unpairedAmounts = [];
  const allWeights = [];

  for (const segment of segments) {
    const amounts = findAmounts(segment);
    const weights = findWeights(segment);
    allWeights.push(...weights);

    for (const a of amounts) {
      if (weights.length === 0) {
        unpairedAmounts.push(a);
        continue;
      }
      let nearest = weights[0];
      let minDist = Math.abs(weights[0].index - a.index);
      for (const w of weights) {
        const d = Math.abs(w.index - a.index);
        if (d < minDist) {
          minDist = d;
          nearest = w;
        }
      }
      paired.push({ grams: nearest.grams, amount: a.amount, currency: a.currency });
    }
  }

  return { paired, unpairedAmounts, weights: allWeights };
}

function flattenItemToText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (Array.isArray(item)) return item.map(flattenItemToText).join(" | ");
  if (typeof item === "object") {
    return Object.entries(item)
      .map(([k, v]) => `${k}: ${flattenItemToText(v)}`)
      .join(" | ");
  }
  return String(item);
}

export function extractPricePairs(disclosed) {
  const allPaired = [];
  const allUnpairedAmounts = [];
  const allWeightsSeen = []; // every distinct weight mentioned anywhere, for fallback pairing

  for (const [key, value] of Object.entries(disclosed || {})) {
    // A plain numeric value under a price-named key (e.g. price_usd: 9.99) has
    // no "$" for the regex to key off of — handle it directly as USD.
    if (DIRECT_PRICE_KEY_RE.test(key) && typeof value === "number") {
      allUnpairedAmounts.push({ index: 0, amount: value, currency: "USD" });
      continue;
    }

    if (!PRICE_KEY_RE.test(key)) continue;
    const isServingAmountKey = SERVING_AMOUNT_KEY_RE.test(key);

    const blobs = [];
    if (Array.isArray(value)) {
      for (const item of value) blobs.push(flattenItemToText(item));
    } else if (typeof value === "object" && value !== null) {
      for (const [subKey, subVal] of Object.entries(value)) {
        blobs.push(`${subKey}: ${flattenItemToText(subVal)}`);
      }
    } else {
      blobs.push(`${key}: ${flattenItemToText(value)}`);
    }

    for (const blob of blobs) {
      const { paired, unpairedAmounts, weights } = processBlob(blob);
      allPaired.push(...paired);
      allUnpairedAmounts.push(...unpairedAmounts);
      // brewing/serving amounts aren't real package sizes — don't let them
      // feed the product-wide "exactly one distinct weight" fallback
      if (!isServingAmountKey) {
        allWeightsSeen.push(...weights.map((w) => w.grams));
      }
    }
  }

  // Fallback: if there were amounts with no weight in their own field, and the
  // product discloses exactly one distinct weight elsewhere, assume that's the
  // size those prices refer to (the common "price: $X" + "size: Yg" pattern).
  if (allUnpairedAmounts.length > 0) {
    const distinctWeights = [...new Set(allWeightsSeen.map((g) => Math.round(g * 100) / 100))];
    if (distinctWeights.length === 1) {
      for (const a of allUnpairedAmounts) {
        allPaired.push({ grams: distinctWeights[0], amount: a.amount, currency: a.currency });
      }
    }
    // if there are 0 or 2+ distinct weights with no in-blob pairing, we genuinely
    // can't tell which price maps to which size — leave unpaired (-> needs review)
  }

  return allPaired.filter((p) => p.grams != null && p.amount != null && p.grams > 0 && p.amount > 0);
}

/**
 * Resolve a product's canonical price: the smallest-size pair, in whichever
 * currency has data (USD preferred if both present). Returns null fields +
 * needsReview: true if no confident single answer exists.
 */
export function resolveCanonicalPrice(disclosed, contradictionsText = "") {
  const pairs = extractPricePairs(disclosed);

  const byCurrency = { USD: [], JPY: [] };
  for (const p of pairs) {
    if (byCurrency[p.currency]) byCurrency[p.currency].push(p);
  }

  const hadPriceContradiction = /price|\$|¥|cost/i.test(contradictionsText);

  const currency = byCurrency.USD.length > 0 ? "USD" : byCurrency.JPY.length > 0 ? "JPY" : null;

  if (!currency) {
    return {
      priceUsd: null,
      priceNative: null,
      priceCurrency: null,
      priceSizeGrams: null,
      pricePerGram: null,
      needsReview: true,
      reviewReason: "no_price_size_pair_found",
    };
  }

  const candidates = byCurrency[currency];
  const minGrams = Math.min(...candidates.map((c) => c.grams));
  const atMinSize = candidates.filter((c) => Math.abs(c.grams - minGrams) < 0.01);
  const distinctAmounts = new Set(atMinSize.map((c) => c.amount));

  if (distinctAmounts.size > 1) {
    return {
      priceUsd: null,
      priceNative: null,
      priceCurrency: currency,
      priceSizeGrams: minGrams,
      pricePerGram: null,
      needsReview: true,
      reviewReason: "conflicting_prices_at_smallest_size",
    };
  }

  const amount = atMinSize[0].amount;
  const pricePerGram = amount / minGrams;

  return {
    priceUsd: currency === "USD" ? amount : null,
    priceNative: amount,
    priceCurrency: currency,
    priceSizeGrams: minGrams,
    pricePerGram: currency === "USD" ? pricePerGram : null,
    needsReview: hadPriceContradiction,
    reviewReason: hadPriceContradiction ? "flagged_price_contradiction_in_research" : null,
  };
}
