// Extracts (grams, price, currency) pairs from a product's free-form "disclosed"
// research data, then picks the smallest offered size as the canonical price.
// Deliberately conservative: if it can't find a confident, unambiguous pair,
// it returns null rather than guessing — those get flagged for manual review.

const PRICE_KEY_RE = /price|cost|size|sku|variant|pricing|weight|count|format/i;
// Brewing/prep amounts (water volume, spoon measures) get swept up by the
// generic "size" keyword match but are NOT retail package sizes — excluding
// them from weight extraction specifically (they can still be scanned for
// amounts, which they never actually contain).
const SERVING_AMOUNT_KEY_RE = /serving[_\s]?size|serving[_\s]?amount|serving[_\s]?guidance/i;
// A "discount"/"savings" key holds an amount-OFF figure (e.g. "$21.20 off"),
// never a real price — it happens to satisfy PRICE_KEY_RE only because
// "discount" contains "count" as a substring, an unintended collision with
// the "item count"/"pack count" keys that keyword was meant for.
const DISCOUNT_AMOUNT_KEY_RE = /^discount$|^savings?$|discount[_\s]?amount|savings?[_\s]?amount/i;

// Is this key name clearly a monetary amount (so a bare number under it,
// with no "$"/"¥"/"£" of its own, should be treated as a currency amount)?
// Deliberately broad on "contains price/cost", since real key names vary a
// lot ("price_usd", "regular_price_usd", "sale_price_usd", "cost", "msrp"...)
// — but excludes per-unit RATES (price_per_gram, discount_pct), which are
// numerically much smaller and would produce nonsense if treated as a full
// price.
const RATE_EXCLUSION_RE = /per[_\s]?(gram|g\b|serving|oz|unit|cup)|_pct\b|percent/i;
function isMoneyKey(key) {
  if (RATE_EXCLUSION_RE.test(key)) return false;
  return /price|cost|amount|msrp/i.test(key) || /^regular$|^sale$/i.test(key);
}

const WEIGHT_RE = /(\d+(?:\.\d+)?)\s?(kg|kilograms?|g\b|grams?|gram|oz\b|ounces?|lbs?\b|pounds?)\b/gi;
const USD_RE = /(?:US\$|USD\s?\$?|\$)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const JPY_RE = /(?:¥|JPY\s?|yen\s?)\s?([\d,]+)|([\d,]+)\s?(?:yen|¥|JPY)/gi;
const GBP_RE = /(?:£|GBP\s?£?)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const EUR_RE = /(?:€|EUR\s?€?)\s?([\d,]+(?:\.\d{1,2})?)/gi;

function unitToGrams(value, unit) {
  const u = unit.toLowerCase();
  if (u.startsWith("kg") || u.startsWith("kilo")) return value * 1000;
  if (u.startsWith("lb") || u.startsWith("pound")) return value * 453.592;
  if (u.startsWith("oz") || u.startsWith("ounce")) return value * 28.3495;
  return value; // grams
}

// A weight immediately preceded by "per" (e.g. "133.00 per 100g", or a key
// name like "price_per_100g") is the unit in a normalized comparison rate,
// not a real package size — same reasoning as isPerUnitRate below, applied
// to the weight side of the phrase. Tolerates "_" as well as whitespace so
// it also catches the pattern embedded in a key name.
const PER_UNIT_RATE_BEHIND_RE = /per[_\s]*$/i;
function isPerUnitRateWeight(text, matchStartIndex) {
  return PER_UNIT_RATE_BEHIND_RE.test(text.slice(Math.max(0, matchStartIndex - 6), matchStartIndex));
}

function findWeights(text) {
  const out = [];
  let m;
  const re = new RegExp(WEIGHT_RE.source, "gi");
  while ((m = re.exec(text))) {
    if (isPerUnitRateWeight(text, m.index)) continue;
    const unit = m[2].toLowerCase();
    out.push({
      index: m.index,
      grams: unitToGrams(parseFloat(m[1]), m[2]),
      isNativeGram: unit.startsWith("g") && !unit.startsWith("gal"),
    });
  }
  return out;
}

// A price figure immediately followed by "per <weight unit>" (e.g. "EUR
// 133.00 per 100g", "$4.20 per oz") is a normalized comparison rate, not a
// real price for that size — including it would create a false pair against
// the size word following "per", and a false conflict against the actual
// price. Deliberately narrow to weight units only (not "per serving"/"per
// unit"/"per cup"), since those describe how a genuine, real price is dosed
// rather than restating it at a different, unrelated package size.
const PER_UNIT_RATE_AHEAD_RE =
  /^\s*per[_\s]*\d*\.?\d*[_\s]*(kg|kilograms?|g\b|grams?|gram|oz\b|ounces?|lbs?\b|pounds?)\b/i;
function isPerUnitRate(text, matchEndIndex) {
  return PER_UNIT_RATE_AHEAD_RE.test(text.slice(matchEndIndex, matchEndIndex + 12));
}

function findAmounts(text, priceType) {
  const out = [];
  let m;
  const usd = new RegExp(USD_RE.source, "gi");
  while ((m = usd.exec(text))) {
    if (isPerUnitRate(text, m.index + m[0].length)) continue;
    out.push({ index: m.index, amount: parseFloat(m[1].replace(/,/g, "")), currency: "USD", priceType });
  }
  const jpy = new RegExp(JPY_RE.source, "gi");
  while ((m = jpy.exec(text))) {
    if (isPerUnitRate(text, m.index + m[0].length)) continue;
    const raw = m[1] || m[2];
    if (raw) out.push({ index: m.index, amount: parseFloat(raw.replace(/,/g, "")), currency: "JPY", priceType });
  }
  const gbp = new RegExp(GBP_RE.source, "gi");
  while ((m = gbp.exec(text))) {
    if (isPerUnitRate(text, m.index + m[0].length)) continue;
    out.push({ index: m.index, amount: parseFloat(m[1].replace(/,/g, "")), currency: "GBP", priceType });
  }
  const eur = new RegExp(EUR_RE.source, "gi");
  while ((m = eur.exec(text))) {
    if (isPerUnitRate(text, m.index + m[0].length)) continue;
    out.push({ index: m.index, amount: parseFloat(m[1].replace(/,/g, "")), currency: "EUR", priceType });
  }
  return out;
}

// Sub-key names that signal WHICH of possibly-multiple prices is the one a
// customer actually pays right now, vs. a crossed-out list/regular price.
const SALE_KEY_RE = /sale|discount|current[_\s]?price|now[_\s]?price/i;
const REGULAR_KEY_RE = /regular|list[_\s]?price|msrp|original[_\s]?price|full[_\s]?price/i;

function priceTypeFromKey(key) {
  if (SALE_KEY_RE.test(key)) return "sale";
  if (REGULAR_KEY_RE.test(key)) return "regular";
  return undefined;
}

// Some products encode price as an object keyed by SIZE with bare-number
// values and the currency named only on the PARENT key, e.g.
// "sizes_and_prices_JPY": {"20g can": 4200, "40g can": 8120}. Neither
// isMoneyKey (checks the sub-key, which is a size label here, not a money
// word) nor the plain findAmounts regex (no "¥"/"$" on a bare number) would
// ever catch this on their own — the money-ness and currency both come from
// the parent key name alone.
const PRICE_OBJECT_KEY_RE = /price|cost/i;
const CURRENCY_SYMBOL = { USD: "$", JPY: "¥", GBP: "£", EUR: "€" };
function currencyHintFromKey(key) {
  if (/jpy|yen|¥/i.test(key)) return "JPY";
  if (/gbp|£/i.test(key)) return "GBP";
  if (/eur|€/i.test(key)) return "EUR";
  if (/usd|\$/i.test(key)) return "USD";
  return null;
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
      // If a directly-stated gram weight represents the SAME size as the
      // nearest match (within clustering tolerance — e.g. "30g (1oz):
      // $27.95", where "1oz" happens to sit textually closer), prefer the
      // page's own gram figure over the oz/lb conversion. But don't
      // substitute a native-gram weight that's actually a DIFFERENT
      // quantity — e.g. "$20 ... 6.3 oz total (12 sticks, 15 grams per
      // stick)" has a real per-stick weight that has nothing to do with the
      // whole box's price, and swapping it in would silently attach the
      // box's price to a single stick's size.
      if (!nearest.isNativeGram) {
        const equivalentNative = weights.find(
          (w) => w.isNativeGram && Math.abs(w.grams - nearest.grams) / nearest.grams <= 0.1
        );
        if (equivalentNative) nearest = equivalentNative;
      }
      paired.push({ grams: nearest.grams, amount: a.amount, currency: a.currency, priceType: a.priceType });
    }
  }

  return { paired, unpairedAmounts, weights: allWeights };
}

function flattenItemToText(item, keyHint) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number") {
    return keyHint && isMoneyKey(keyHint) ? `$${item}` : String(item);
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

// Shared collection pass used by both extractPricePairs (which needs the
// fallback-paired, weight-filtered result) and hasAnyPriceAmount (which just
// needs to know whether ANY amount was found anywhere, paired or not — used
// to distinguish "no price disclosed at all" from "price disclosed but size
// is ambiguous" when reporting what needs manual review).
function collectAmountsAndWeights(disclosed) {
  const allPaired = [];
  const allUnpairedAmounts = [];
  const allWeightsSeen = []; // every distinct weight mentioned anywhere, for fallback pairing

  for (const [key, value] of Object.entries(disclosed || {})) {
    if (DISCOUNT_AMOUNT_KEY_RE.test(key)) continue;

    // A plain numeric value under a price-named key (e.g. price_usd: 9.99) has
    // no "$" for the regex to key off of — handle it directly as USD.
    if (isMoneyKey(key) && typeof value === "number") {
      allUnpairedAmounts.push({ index: 0, amount: value, currency: "USD", priceType: priceTypeFromKey(key) });
      continue;
    }

    if (!PRICE_KEY_RE.test(key)) continue;
    const isServingAmountKey = SERVING_AMOUNT_KEY_RE.test(key);

    const blobs = [];
    if (Array.isArray(value)) {
      for (const item of value) blobs.push({ text: flattenItemToText(item), priceType: undefined });
    } else if (typeof value === "object" && value !== null) {
      const parentCurrency = PRICE_OBJECT_KEY_RE.test(key) ? currencyHintFromKey(key) : null;
      for (const [subKey, subVal] of Object.entries(value)) {
        // Key name is included in the scanned text on purpose — some products
        // encode the size IN the key itself (e.g. "prices_and_sizes": {"30g
        // (1oz)": "$27.95"}), which findWeights needs to see. A key like
        // "price_per_100g" also contains a weight-shaped substring, but that
        // case is handled separately by excluding weights preceded by "per".
        // Guard against per-unit-rate/percentage sub-keys (e.g. a sibling
        // "discount_pct": 30 next to "regular"/"sale") — same exclusion used
        // by isMoneyKey elsewhere, so a rate doesn't get mistaken for a price
        // just because it shares a parent object with real currency values.
        const valueText =
          parentCurrency && typeof subVal === "number" && !RATE_EXCLUSION_RE.test(subKey)
            ? `${CURRENCY_SYMBOL[parentCurrency]}${subVal}`
            : flattenItemToText(subVal, subKey);
        blobs.push({
          text: `${subKey}: ${valueText}`,
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

  return { allPaired, allUnpairedAmounts };
}

// Some brands (e.g. Breakaway Matcha) price tiers by SERVING COUNT rather
// than weight, with the count baked into the key name itself, e.g.
// "price_30_servings": "$48.00 ($1.28/serving)" or "price_100_servings":
// "$1.03/serving" (a rate only, no flat total given for that tier). These
// are only convertible to a real gram size when the product discloses an
// explicit servings-to-grams ratio elsewhere (e.g. serving_size: "One
// gram...") — we never assume 1 serving = 1 gram without seeing it stated,
// since other brands price by serving count with no such ratio at all.
const SERVINGS_PRICE_KEY_RE = /^price[_\s].*?(\d+)[_\s]*servings?$/i;
const SERVING_TO_GRAM_RE = /(?:^|\b)(one|\d+(?:\.\d+)?)\s*grams?\b/i;

function gramsPerServingFromDisclosed(disclosed) {
  for (const [key, value] of Object.entries(disclosed || {})) {
    if (!SERVING_AMOUNT_KEY_RE.test(key) || typeof value !== "string") continue;
    const m = SERVING_TO_GRAM_RE.exec(value);
    if (m) return m[1].toLowerCase() === "one" ? 1 : parseFloat(m[1]);
  }
  return null;
}

// A dollar figure immediately followed by "/serving" is a per-serving RATE,
// not the tier's flat total — has to be multiplied by the serving count.
// Prefer an actual flat total if the same string also states one (e.g.
// "$48.00 ($1.28/serving)" — 48.00 is the real total, 1.28 is just the
// derived per-serving figure for comparison shopping).
function amountFromServingTierValue(value, servings) {
  // Capturing an optional "/serving" as PART of each match (rather than a
  // lookahead) avoids a backtracking trap: a lookahead here would let the
  // engine shrink the optional decimal group to satisfy it, silently
  // truncating "$1.03" down to "$1" to dodge a following "/serving".
  const dollarRe = /\$([\d,]+(?:\.\d{1,2})?)(\s*\/\s*serving)?/gi;
  let m;
  let total = null;
  let rate = null;
  while ((m = dollarRe.exec(value))) {
    const amount = parseFloat(m[1].replace(/,/g, ""));
    if (m[2]) {
      rate = amount;
    } else {
      total = amount;
    }
  }
  if (total != null) return total;
  if (rate != null) return Math.round(rate * servings * 100) / 100;
  return null;
}

function extractServingTierPairs(disclosed) {
  const gramsPerServing = gramsPerServingFromDisclosed(disclosed);
  if (gramsPerServing == null) return [];

  const pairs = [];
  for (const [key, value] of Object.entries(disclosed || {})) {
    const keyMatch = SERVINGS_PRICE_KEY_RE.exec(key);
    if (!keyMatch || typeof value !== "string") continue;
    const servings = parseFloat(keyMatch[1]);
    const amount = amountFromServingTierValue(value, servings);
    if (amount == null) continue;
    pairs.push({ grams: servings * gramsPerServing, amount, currency: "USD", priceType: undefined });
  }
  return pairs;
}

// Many Shopify-style product pages disclose ONE overall price (regular_price/
// sale_price/price/price_usd) plus size options captured in one of three
// shapes: a plain-string array (e.g. "size_variants": ["1oz/30g", "3.5oz",
// "12oz"]), an object array with a size sub-field (e.g. "size_variants":
// [{size: "30g (1.06 oz)", cups: 15}, ...]), or ONE free-text string
// mentioning multiple weights (e.g. "sizes": "20 Gram Tin and 40 Gram Tin
// (both listed sold out)") — with no per-size price breakdown captured in
// any of the three. The page itself links them — the shown price is for
// whichever size is pre-selected, which is consistently the FIRST-mentioned
// option on this dataset's sites (verified live across six unrelated
// brands: Matcha Outlet, Naoki Matcha, Jade Leaf, Nio Teas, Encha, Gion
// Tsujiri — the last confirmed by screenshot, since the selected state
// doesn't survive a plain-text page read). This is an INFERENCE, not a
// stated fact, so pairs from here are always tagged `inferred: true` and
// shown labeled as such rather than blended in with explicitly-stated
// pricing. Only used as a last resort, when nothing else resolved anything.
const SIZE_ARRAY_KEY_RE = /size|variant/i;
const SINGLE_PRICE_KEY_RE = /^regular_price$|^sale_price$|^price$/i;

function firstVariantSizeText(firstEntry) {
  if (typeof firstEntry === "string") return firstEntry;
  if (typeof firstEntry !== "object" || firstEntry === null) return null;
  // An object entry (e.g. {size: "30g (1.06 oz)", cups: 15}) — pull the
  // size-labeled sub-field specifically, so an unrelated number sitting in
  // the same object (like "cups: 15") never gets mistaken for a weight.
  const sizeField = Object.entries(firstEntry).find(([k, v]) => /size/i.test(k) && typeof v === "string");
  return sizeField ? sizeField[1] : null;
}

function extractInferredFirstVariantPairs(disclosed) {
  const sizeArrayEntry = Object.entries(disclosed || {}).find(
    ([k, v]) =>
      SIZE_ARRAY_KEY_RE.test(k) &&
      Array.isArray(v) &&
      v.length > 0 &&
      (typeof v[0] === "string" || (typeof v[0] === "object" && v[0] !== null))
  );

  // Guard against text comparing MULTIPLE RETAILERS' separate offerings
  // (e.g. "30g net weight (Sazen); Ujichamatcha also offers a 150g option")
  // rather than describing ONE page's own size-selector — caught via manual
  // spot-check (Kaguraden: the shown price was explicitly Ujichamatcha's,
  // for their 150g size, while the first-mentioned size, 30g, was Sazen's —
  // pairing them would silently attach the wrong retailer's price to the
  // wrong retailer's size). A parenthetical proper-noun mention is the
  // tell — a real size label's parens hold a unit conversion ("(1.06 oz)"),
  // never something shaped like a company name.
  const CITES_EXTERNAL_SOURCE_RE = /\(\s*[A-Z][a-zA-Z]*(?:\.(?:com|co|net))?[,)]/;

  let weights;
  if (sizeArrayEntry) {
    const firstText = firstVariantSizeText(sizeArrayEntry[1][0]);
    if (firstText && CITES_EXTERNAL_SOURCE_RE.test(firstText)) return [];
    weights = firstText ? findWeights(firstText) : [];
  } else {
    // Fallback: sizes described in ONE free-text string mentioning 2+
    // weights, rather than a structured array. Requires 2+ weight mentions
    // so this never fires on a plain single-size string (which the normal
    // pairing pass already handles), and stays scoped to keys that are
    // explicitly about size/variants, not an unrelated blob that happens to
    // mention two numbers for different reasons.
    const sizeStringEntry = Object.entries(disclosed || {}).find(
      ([k, v]) => SIZE_ARRAY_KEY_RE.test(k) && typeof v === "string" && findWeights(v).length >= 2
    );
    if (sizeStringEntry && CITES_EXTERNAL_SOURCE_RE.test(sizeStringEntry[1])) return [];
    weights = sizeStringEntry ? findWeights(sizeStringEntry[1]) : [];
  }
  if (weights.length === 0) return [];

  // Keep the FIRST-mentioned weight (reading order) — the verified
  // convention — but prefer a directly-stated gram figure if it's
  // numerically the same size as that first mention (e.g. "1oz/30g": 30g is
  // the page's own number, not the oz conversion).
  const firstWeight = weights[0];
  const equivalentNative = weights.find(
    (w) => w.isNativeGram && Math.abs(w.grams - firstWeight.grams) / firstWeight.grams <= 0.1
  );
  const grams = (equivalentNative || firstWeight).grams;

  const pairs = [];
  for (const [key, value] of Object.entries(disclosed || {})) {
    if (isMoneyKey(key) && typeof value === "number") {
      pairs.push({ grams, amount: value, currency: "USD", priceType: priceTypeFromKey(key), inferred: true });
      continue;
    }
    if (!SINGLE_PRICE_KEY_RE.test(key) || typeof value !== "string") continue;
    if (CITES_EXTERNAL_SOURCE_RE.test(value)) continue;
    for (const a of findAmounts(value, priceTypeFromKey(key))) {
      pairs.push({ grams, amount: a.amount, currency: a.currency, priceType: a.priceType, inferred: true });
    }
  }
  return pairs;
}

export function extractPricePairs(disclosed) {
  const { allPaired } = collectAmountsAndWeights(disclosed);
  let allPairs = [...allPaired, ...extractServingTierPairs(disclosed)].filter(
    (p) => p.grams != null && p.amount != null && p.grams > 0 && p.amount > 0
  );
  if (allPairs.length === 0) {
    allPairs = extractInferredFirstVariantPairs(disclosed).filter(
      (p) => p.grams != null && p.amount != null && p.grams > 0 && p.amount > 0
    );
  }
  return allPairs;
}

// Groups already-same-currency pairs by package size (10% tolerance, same
// reasoning as clusterWeights — an oz figure and its "~Xg" conversion land a
// hair apart numerically but are clearly the same physical size).
function clusterPairsByGrams(pairs) {
  if (pairs.length === 0) return [];
  const sorted = [...pairs].sort((a, b) => a.grams - b.grams);
  const clusters = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = clusters[clusters.length - 1];
    const avg = last.reduce((s, v) => s + v.grams, 0) / last.length;
    if (Math.abs(current.grams - avg) / avg <= 0.1) {
      last.push(current);
    } else {
      clusters.push([current]);
    }
  }
  return clusters;
}

// Given a cluster of same-size, same-currency pairs, pick the single
// confident amount where possible: unanimous, or disambiguated by sale/
// regular tagging. Returns amount: null (never a guess) when multiple
// genuinely different prices exist for this size and there's no tag telling
// us which one a customer actually pays — allAmounts is always the full raw
// list so callers can show exactly what was disclosed rather than a
// resolution we invented.
function resolveClusterAmount(cluster) {
  const inferred = cluster.every((c) => c.inferred);
  const allAmounts = [...new Set(cluster.map((c) => c.amount))];
  if (allAmounts.length === 1) {
    return { amount: allAmounts[0], allAmounts, inferred };
  }
  const saleAmounts = [...new Set(cluster.filter((c) => c.priceType === "sale").map((c) => c.amount))];
  if (saleAmounts.length === 1) {
    return { amount: saleAmounts[0], allAmounts, inferred };
  }
  return { amount: null, allAmounts, inferred };
}

/**
 * Every distinct size/price offering actually disclosed for a product — not
 * just the smallest. This is what the product detail page shows: the raw
 * pricing table as found, rather than a single collapsed "canonical" number.
 */
export function extractPriceVariants(disclosed) {
  const pairs = extractPricePairs(disclosed);
  const byCurrency = {};
  for (const p of pairs) {
    (byCurrency[p.currency] ||= []).push(p);
  }

  const variants = [];
  for (const [currency, list] of Object.entries(byCurrency)) {
    for (const cluster of clusterPairsByGrams(list)) {
      const grams = cluster.reduce((s, v) => s + v.grams, 0) / cluster.length;
      const { amount, allAmounts, inferred } = resolveClusterAmount(cluster);
      variants.push({
        grams,
        priceCurrency: currency,
        priceNative: amount,
        allAmounts,
        needsReview: amount == null,
        inferred: amount != null && inferred,
      });
    }
  }

  return variants.sort((a, b) => a.grams - b.grams);
}

// Was ANY price amount found anywhere in the disclosed data, regardless of
// whether it could be tied to a specific size? Used to tell "no price
// disclosed at all" apart from "price disclosed but size is ambiguous" —
// the latter is worth a human's review, the former isn't (nothing to review).
export function hasAnyPriceAmount(disclosed) {
  const { allPaired, allUnpairedAmounts } = collectAmountsAndWeights(disclosed);
  return allPaired.length > 0 || allUnpairedAmounts.length > 0;
}

/**
 * Resolve a product's canonical price: the smallest-size pair, in whichever
 * currency has data (USD preferred if both present). Returns null fields +
 * needsReview: true if no confident single answer exists.
 */
export function resolveCanonicalPrice(disclosed, contradictionsText = "") {
  const pairs = extractPricePairs(disclosed);

  const byCurrency = { USD: [], JPY: [], GBP: [], EUR: [] };
  for (const p of pairs) {
    if (byCurrency[p.currency]) byCurrency[p.currency].push(p);
  }

  const hadPriceContradiction = /price|\$|¥|£|€|cost/i.test(contradictionsText);

  const currency =
    byCurrency.USD.length > 0
      ? "USD"
      : byCurrency.JPY.length > 0
        ? "JPY"
        : byCurrency.GBP.length > 0
          ? "GBP"
          : byCurrency.EUR.length > 0
            ? "EUR"
            : null;

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
  const { amount, inferred } = resolveClusterAmount(atMinSize);

  if (amount == null) {
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

  const pricePerGram = amount / minGrams;
  const needsReview = hadPriceContradiction || inferred;

  return {
    priceUsd: currency === "USD" ? amount : null,
    priceNative: amount,
    priceCurrency: currency,
    priceSizeGrams: minGrams,
    pricePerGram: currency === "USD" ? pricePerGram : null,
    needsReview,
    reviewReason: hadPriceContradiction
      ? "flagged_price_contradiction_in_research"
      : inferred
        ? "size_inferred_from_listed_option"
        : null,
  };
}
