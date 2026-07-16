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
    const unit = m[2].toLowerCase();
    out.push({
      index: m.index,
      grams: unitToGrams(parseFloat(m[1]), m[2]),
      isNativeGram: unit.startsWith("g") && !unit.startsWith("gal"),
    });
  }
  return out;
}

function findAmounts(text, priceType) {
  const out = [];
  let m;
  const usd = new RegExp(USD_RE.source, "gi");
  while ((m = usd.exec(text))) {
    out.push({ index: m.index, amount: parseFloat(m[1].replace(/,/g, "")), currency: "USD", priceType });
  }
  const jpy = new RegExp(JPY_RE.source, "gi");
  while ((m = jpy.exec(text))) {
    const raw = m[1] || m[2];
    if (raw) out.push({ index: m.index, amount: parseFloat(raw.replace(/,/g, "")), currency: "JPY", priceType });
  }
  return out;
}

// Sub-key names that signal WHICH of possibly-multiple prices is the one a
// customer actually pays right now, vs. a crossed-out list/regular price.
const SALE_KEY_RE = /^sale|discount|current[_\s]?price|now[_\s]?price/i;
const REGULAR_KEY_RE = /^regular|list[_\s]?price|msrp|original[_\s]?price|full[_\s]?price/i;

function priceTypeFromKey(key) {
  if (SALE_KEY_RE.test(key)) return "sale";
  if (REGULAR_KEY_RE.test(key)) return "regular";
  return undefined;
}

// Processes one "blob" (a single key's flattened text, or a single array item's
// flattened text). Splits on segment delimiters first (";", "|") so that
// strings like "$26.00 (30g); $49.00 (80g)" pair each price with the weight in
// its OWN segment, rather than whichever weight happens to be fewer characters
// away in the raw string (which gets the wrong answer when multiple
// price/size pairs are packed into one string). Amounts/weights that don't
// find an in-segment partner are returned separately so the caller can attempt
// a product-wide fallback pairing.
function processBlob(text, priceType) {
  const segments = text.split(/;/);
  const paired = [];
  const unpairedAmounts = [];
  const allWeights = [];

  for (const segment of segments) {
    const amounts = findAmounts(segment, priceType);
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
      paired.push({ grams: nearest.grams, amount: a.amount, currency: a.currency, priceType: a.priceType });
    }
  }

  return { paired, unpairedAmounts, weights: allWeights };
}

// Sub-key names that indicate a bare number is a monetary amount, e.g.
// price_usd: { regular: 17.98, sale: 12.60 } — "regular"/"sale" have no
// currency symbol of their own, but their key name makes the intent clear.
const MONEY_SUBKEY_RE = /^price$|^cost$|^amount$|^msrp$|regular|sale/i;

function flattenItemToText(item, keyHint) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number") {
    return keyHint && MONEY_SUBKEY_RE.test(keyHint) ? `$${item}` : String(item);
  }
  if (typeof item === "boolean") return String(item);
  if (Array.isArray(item)) return item.map((v) => flattenItemToText(v)).join(" | ");
  if (typeof item === "object") {
    return Object.entries(item)
      .map(([k, v]) => `${k}: ${flattenItemToText(v, k)}`)
      .join(" | ");
  }
  return String(item);
}

// Groups weights that are within 10% of each other (typical rounding slop
// between an oz/lb figure and its "~Xg" gram conversion) into one cluster.
// Each cluster's representative value prefers a directly-stated gram figure
// (e.g. "30g") over one derived from converting oz/lb (e.g. 1.05oz -> 29.77g)
// — the page's own gram figure is the cleaner, more authoritative number.
function clusterWeights(weights) {
  if (weights.length === 0) return [];
  const sorted = [...weights].sort((a, b) => a.grams - b.grams);
  const clusters = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastCluster = clusters[clusters.length - 1];
    const clusterAvg = lastCluster.reduce((s, v) => s + v.grams, 0) / lastCluster.length;
    if (Math.abs(current.grams - clusterAvg) / clusterAvg <= 0.1) {
      lastCluster.push(current);
    } else {
      clusters.push([current]);
    }
  }
  return clusters.map((c) => {
    const nativeGram = c.find((v) => v.isNativeGram);
    return nativeGram ? nativeGram.grams : c.reduce((s, v) => s + v.grams, 0) / c.length;
  });
}

export function extractPricePairs(disclosed) {
  const allPaired = [];
  const allUnpairedAmounts = [];
  const allWeightsSeen = []; // every distinct weight mentioned anywhere, for fallback pairing

  for (const [key, value] of Object.entries(disclosed || {})) {
    // A plain numeric value under a price-named key (e.g. price_usd: 9.99) has
    // no "$" for the regex to key off of — handle it directly as USD.
    if (DIRECT_PRICE_KEY_RE.test(key) && typeof value === "number") {
      allUnpairedAmounts.push({ index: 0, amount: value, currency: "USD", priceType: priceTypeFromKey(key) });
      continue;
    }

    if (!PRICE_KEY_RE.test(key)) continue;
    const isServingAmountKey = SERVING_AMOUNT_KEY_RE.test(key);

    const blobs = [];
    if (Array.isArray(value)) {
      for (const item of value) blobs.push({ text: flattenItemToText(item), priceType: undefined });
    } else if (typeof value === "object" && value !== null) {
      for (const [subKey, subVal] of Object.entries(value)) {
        blobs.push({
          text: `${subKey}: ${flattenItemToText(subVal, subKey)}`,
          priceType: priceTypeFromKey(subKey),
        });
      }
    } else {
      blobs.push({ text: `${key}: ${flattenItemToText(value, key)}`, priceType: priceTypeFromKey(key) });
    }

    for (const blob of blobs) {
      const { paired, unpairedAmounts, weights } = processBlob(blob.text, blob.priceType);
      allPaired.push(...paired);
      allUnpairedAmounts.push(...unpairedAmounts);
      // brewing/serving amounts aren't real package sizes — don't let them
      // feed the product-wide "exactly one distinct weight" fallback
      if (!isServingAmountKey) {
        allWeightsSeen.push(...weights);
      }
    }
  }

  // Fallback: if there were amounts with no weight in their own field, and the
  // product discloses exactly one distinct weight elsewhere, assume that's the
  // size those prices refer to (the common "price: $X" + "size: Yg" pattern).
  // "Distinct" is tolerance-based: "1.8 oz (~50 g)" produces two numerically
  // different values (51.03 from the oz conversion, 50 from the direct gram
  // mention) for what is clearly the same physical size — cluster those
  // together rather than treating them as two different sizes.
  if (allUnpairedAmounts.length > 0) {
    const clusters = clusterWeights(allWeightsSeen);
    if (clusters.length === 1) {
      for (const a of allUnpairedAmounts) {
        allPaired.push({ grams: clusters[0], amount: a.amount, currency: a.currency, priceType: a.priceType });
      }
    }
    // if there are 0 or 2+ distinct-size clusters with no in-blob pairing, we
    // genuinely can't tell which price maps to which size — leave unpaired
    // (-> needs review)
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

  let resolvedAmount = null;

  if (distinctAmounts.size > 1) {
    // Not a genuine conflict if this is just "sale price" vs "regular/list
    // price" for the same item — the sale price is what a customer actually
    // pays right now, so prefer it rather than flagging as ambiguous.
    const saleAmounts = new Set(atMinSize.filter((c) => c.priceType === "sale").map((c) => c.amount));
    if (saleAmounts.size === 1) {
      resolvedAmount = [...saleAmounts][0];
    } else {
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
  } else {
    resolvedAmount = atMinSize[0].amount;
  }

  const amount = resolvedAmount;
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
