// Consolidates the many free-form taste/flavor/aroma-related keys found
// across this dataset's archived research (tasting_notes, flavor_profile,
// aroma, sweetness_level, mouthfeel, texture, and ~65 other key-name
// variants -- each product was researched somewhat ad-hoc against no fixed
// schema, so the same concept ended up under many different key names) into
// one canonical tasting_notes field per product.

const TASTE_KEY_RE = /taste|tasting|flavor|flavour|aroma|umami|bitterness|sweetness|astringen|mouthfeel|texture/i;

// Values that are meta-notes about missing data, not real tasting content --
// excluding them keeps a "not disclosed" marker from polluting the
// consolidated field as if it were an actual observation. Deliberately does
// NOT match a bare "not <adjective>" value like "Not Sweet", which is a real
// taste descriptor (low sweetness), not an absence-of-data marker -- caught
// by testing this distinction against real data before shipping it.
const NO_DATA_MARKER_RE =
  /^(no|none)\s+(disclosed|provided|specified|stated|mentioned|data|given)\b|not\s+(disclosed|specified|stated|mentioned|explicitly)/i;

function humanizeTasteKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Some archived taste keys hold a plain string ("Rich and creamy"), but many
// hold a nested object (e.g. tasting_notes: {aroma: "...", flavor: "...",
// liquor: "...", dry_leaves: "..."}) or an array (either short descriptor
// tags like ["Nutty", "Cacao Nibs", "Honeydew"], or a list of longer
// sub-notes). A flat `typeof value === "string"` check silently drops all of
// these -- found affecting 78 products where the ONLY taste data present was
// nested, and every one of them ended up with a null tasting_notes column as
// a result. Recurses through objects and arrays, carrying the parent key
// name forward as a label prefix so the output stays organized (e.g.
// "Tasting Notes Aroma: ..." rather than losing which sub-field a note
// belongs to).
function collectTasteText(value, labelPrefix, parts, seenValues) {
  if (value == null) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const trimmed = String(value).trim();
    if (!trimmed || NO_DATA_MARKER_RE.test(trimmed)) return;
    if (seenValues.has(trimmed)) return;
    seenValues.add(trimmed);
    parts.push(`${labelPrefix}: ${trimmed}`);
    return;
  }
  if (Array.isArray(value)) {
    const stringItems = value.filter((v) => typeof v === "string");
    if (stringItems.length === value.length && stringItems.length > 0) {
      // a short list of descriptor tags ("Nutty", "Cacao Nibs", ...) reads
      // better joined onto one line than as separate numbered entries
      const joined = stringItems
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");
      if (joined && !seenValues.has(joined)) {
        seenValues.add(joined);
        parts.push(`${labelPrefix}: ${joined}`);
      }
    } else {
      for (const item of value) collectTasteText(item, labelPrefix, parts, seenValues);
    }
    return;
  }
  if (typeof value === "object") {
    for (const [subKey, subValue] of Object.entries(value)) {
      collectTasteText(subValue, `${labelPrefix} ${humanizeTasteKey(subKey)}`, parts, seenValues);
    }
  }
}

export function consolidateTastingNotes(disclosed) {
  if (!disclosed) return null;
  const parts = [];
  const seenValues = new Set();
  for (const [key, value] of Object.entries(disclosed)) {
    if (!TASTE_KEY_RE.test(key)) continue;
    collectTasteText(value, humanizeTasteKey(key), parts, seenValues);
  }
  if (parts.length === 0) return null;
  return parts.join(" | ");
}
