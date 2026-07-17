# Live-Scraping & Data-Hygiene Notes

This file exists because we will re-run this pipeline periodically as brands change their pages,
prices drift, and new products get added. Every quirk documented here was expensive to discover
once — the goal is to never rediscover it. **When you find a new one-off gotcha while re-scraping,
add it here before you forget it, even if it only affects one product.**

## Pipeline overview

```
S3 (matcha-product-database bucket, raw research JSON)
  → scripts/build-db.mjs
      merges in: data/live-prices.json           (scripts/scrape-live-prices.mjs)
                 data/live-attributes.json        (scripts/scrape-live-attributes.mjs)
                 data/removed-products.json               (curated)
                 data/price-display-overrides.json        (curated)
                 data/resolved-contradictions.json        (curated)
                 data/secondary-source-brand-links.json   (curated)
    → data/matcha.db (committed to repo)
```

Live-scraped data always wins over archived research text when both exist for the same field —
the archived text is a point-in-time snapshot from whenever the original research happened; a
fresh scrape is closer to truth. Curated override files exist for the judgment calls that can't
be automated: a human (or Claude, verifying against the live page) decided this specific case.

## Re-running the pipeline when prices/pages have drifted

1. `node scripts/scrape-live-prices.mjs --strategy=shopify_var_meta` (repeat per strategy — see
   `data/extraction-strategy-scan.json` for which domains use which strategy). Add
   `--retry-failed` to re-attempt only products that failed last time.
2. `node scripts/scrape-live-attributes.mjs` for grade/cultivar/region (same `--retry-failed`,
   `--limit=N` flags available).
3. `npm run build:db` to rebuild `data/matcha.db` from everything above.
4. Verify: `npx tsc --noEmit && npm run build`, spot-check a handful of product pages via
   `curl localhost:3000/products/<id>` after restarting `npm run dev`, before committing.
5. Re-scraping does NOT need to touch the curated override files (`removed-products.json`,
   `price-display-overrides.json`, `resolved-contradictions.json`,
   `secondary-source-brand-links.json`) unless a product genuinely changed category (e.g. a brand
   switched from tin pricing to stick-pack pricing) or a contradiction you marked resolved has
   become newly true again.

## The override files — what each is for, when to add an entry

| File | Purpose | Add an entry when... |
|---|---|---|
| `removed-products.json` | Excludes discontinued/404 products from the build entirely | A product's page is confirmed permanently gone (not just temporarily unreachable) |
| `price-display-overrides.json` | Shows "Pricing available on product page" instead of a computed $/g | A real price exists but the packaging format (stick count, tea-bag count, bag-count multiplier) doesn't reduce to a comparable per-gram figure |
| `resolved-contradictions.json` | Suppresses one specific stale contradiction row | A flagged inconsistency from archived research has been independently reverified as no longer true, via a live-page check |
| `secondary-source-brand-links.json` | Links a lab report / review / safety finding to a brand when the archived research's `matched_brand` came back blank | The finding's own text names a brand that DOES exist in our `brands` table — verify with an exact-name DB query first, never assume from a substring match |

Every entry in every override file should be individually verified against something concrete (a
live page fetch, a DB query) before being added — never bulk-generated from a heuristic without
spot-checking. Every file has caught a real bug from being applied naively at least once (see
below).

## Live-scrape extraction strategies (in order of preference)

1. **Shopify `var meta = {...}` blob** (`extractShopifyVarMeta` in `scrape-live-prices.mjs`) — a
   client-side analytics object server-rendered into the HTML. Plain `fetch()` is enough, no
   browser rendering needed. Covers the majority of domains (Shopify is the dominant platform in
   this dataset).
2. **JSON-LD structured data** (`extractJsonLd`) — `<script type="application/ld+json">`,
   `@type: Product`. Can be a bare object, `{"@graph": [...]}`, or a **bare top-level array**
   `[BreadcrumbList, Product, ...]` — handle all three shapes.
3. **GA4 `dataLayer` events** — WooCommerce sites populate `window.dataLayer` with a `view_item`
   event client-side, AFTER page load. Requires real browser rendering (not plain fetch). Used for
   Marukyu Koyamaen (see brand notes below).
4. **Scoped rendered-text extraction** — last resort, only when nothing structured is available.
   Requires finding a stable anchor phrase in the rendered page and scoping tightly around it (see
   Sazen Tea below) — never scan the whole page's text for a price pattern, you WILL pick up
   related-product or cross-sell prices.

For grade/cultivar/region (`scrape-live-attributes.mjs`), scope is deliberately narrow: **title +
meta description + og:title + og:description only, never full body text.** Body text (nav,
footer, "you may also like" sections) is a real false-positive source — see the Aiya/Breakaway
notes below.

## General gotchas (apply to any domain, not brand-specific)

- **Plain substring matching produces false positives on keyword lists.** `"uji".includes()`
  matches inside "Fuji"; `"premium".includes()` matches inside "Hyperpremium" and inside ordinary
  marketing copy ("crafted from premium ingredients"). Always use word-boundary matching
  (`findFirstKeyword` in `scripts/attribute-extract.mjs`), and be suspicious of any keyword that's
  also a common English word (we removed "premium" from `GRADE_KEYWORDS` entirely for this
  reason — it's not a real formal grade tier the way ceremonial/culinary/koicha/usucha are).
- **JS's plain `\b` word boundary doesn't work on accented characters.** It silently fails to
  match cultivar names like "gokō" (the macron isn't a `\w` character in non-Unicode mode). Use
  Unicode-aware lookaround boundaries (`(?<![\p{L}\p{N}])...(?![\p{L}\p{N}])` with the `u` flag)
  instead — see `findFirstKeyword` in `attribute-extract.mjs`.
- **An empty array is truthy in JS.** `liveVariants.filter(...)` can return `[]`, which is
  truthy — code that checks `if (liveVariants)` will treat "found live data but none of it was
  usable" the same as "use the live data," silently producing zero price rows instead of falling
  back to archived data. Always normalize to `null` immediately after filtering
  (`if (arr && arr.length === 0) arr = null;`).
- **`Node.js fetch()` follows redirects by default; `curl` does not.** If you're manually
  spot-checking a scrape result with `curl`, add `-L` or you'll get a stale 301 redirect target
  instead of the real page (cost real debugging time on Matchaful's Kiwami product, which
  redirects `.../kiwami-...` → `.../organic-kiwami-...`).
- **Pack/multiplier labels need their multiplier detected, not just their weight.** A label like
  "30g tin (3-pack)" contains a real weight number ("30g") that a naive parser will happily
  extract — but it needs multiplying by the pack count (→ 90g), not used as-is. See
  `packMultiplier()` in `scrape-live-prices.mjs`. Only found once in this dataset (Golde) but
  could recur on any Shopify site that sells bundles.
- **Archived contradictions can go stale.** Once you fix a product's price/size, check whether any
  existing `contradictions` row for that product was specifically about the ambiguity you just
  resolved — if so, add it to `resolved-contradictions.json` rather than leaving a resolved price
  sitting next to a warning that contradicts it.
- **"Not in database" notes in archived secondary-source research can be stale**, not authoritative.
  The brand catalog has grown since some of that research was written — always re-verify against
  the current `brands` table with an exact-name query before trusting a "not in our database" note.

## Brand-specific quirks (running log — add to this, don't just fix and forget)

| Brand | Quirk | Fix / handling |
|---|---|---|
| **Marukyu Koyamaen** | WooCommerce Currency Switcher plugin intermittently defaults to USD instead of JPY across sequential page loads (async race between page render and the plugin's currency-detection AJAX call) | Force `?currency=JPY` on every request URL |
| **Sazen Tea** | Price only appears in rendered text as `"Unit price: $X / Yg [description]"`, requires JS rendering (plain fetch returns no digits). Naive whole-page scan bleeds into "Recently viewed" prices further down the page | Scope extraction strictly to the substring between `"Unit price:"` and `"Quantity:"` markers. Single-size products lack the repeated `/Yg` suffix — fall back to `Net weight: (\d+) g` + a bare `$X` match within the scoped section |
| **David's Tea** | Recorded source URLs are stale — missing a `-us` suffix and `/en-us/` locale prefix after a site restructure. Old URLs soft-redirect (HTTP 200) to a generic category page rather than erroring, which looks like "needs browser rendering" rather than a simple broken link | Compare a known-working David's Tea URL against a broken one in the DB to find the current slug pattern; once corrected, the plain Shopify `var meta` fetch works fine |
| **Breakaway Matcha** | Prices ALL 10 products by serving count (30/100/250/500/1000 Servings), no gram weight anywhere in the Shopify variant label | Confirmed via the on-page "What's a serving?" modal: 1 gram = 1 serving, stated site-wide (not per-product). This ratio was never in the archived research since the modal is JS-triggered and easy to miss during manual research |
| **Matcha.com** | Same servings-only sizing as Breakaway, but a DIFFERENT ratio — genuinely NO gram/oz disclosure anywhere on the page or in Shopify metadata (`weight:0`, unset) | User confirmed 1g = 1 serving directly from the physical bag's own packaging — do not assume brands share Breakaway's ratio without independent confirmation |
| **Aiya** | "To Go Sticks" products (single-serving stick/packet format) DO disclose a total net weight ("Size: 96 grams (3.39 oz)") in an on-page spec field, unlike Rishi/Kenko's stick products — but per user direction, still treated as price-link-only for consistency with the rest of the stick-format category, not resolved to a per-gram figure | Curated in `price-display-overrides.json`, not auto-detected |
| **Kenko Tea, Rishi Tea (Matcha Sticks), Numi (Matcha Toasted Rice)** | Priced by bag/stick/tea-bag count multiplier (e.g. "1/3/5 Bags"), not by a comparable package weight | `price-display-overrides.json` — shows "Pricing available on product page" instead of a computed number |
| **Chamberlain Coffee** | Size stated inline as "$X \| Y.YYoz" directly under the product title/description — consistent brand-wide pattern (1.06oz across their whole ceremonial line) once discovered | Reusable per-brand pattern once found for one product in the line |
| **Golde** | "30g tin (3-pack)" label combines a real weight with a pack multiplier that a naive parser mis-reads as a single 30g unit | See general gotcha above — `packMultiplier()` |
| **Encha** | "Limited Edition Reserve" product line (Okumidori, Saemidori) genuinely never discloses a size anywhere — page text, meta tags, AND Shopify metadata (`weight:0`) all empty. Confirmed genuine dead end, not an extraction gap | Left unresolved — do not force a size |
| **DoMatcha** | Most product pages genuinely don't disclose weight (checked Ceremonial, Master's Choice) — but some DO state it in an unexpected spot (Digest Specialty Health Blend states "Net Wt. 2.82oz." inside the ingredients paragraph, not a dedicated spec field) | Check the full page text, not just the obvious spec-field location, before concluding "no size disclosed" |
| **CAP Beauty** | Live site has a real, confirmed display bug: shows "$0" regular price alongside the actual price on some product pages | This is real current site behavior, not archived-data staleness — do NOT mark the corresponding contradiction resolved |

## Verification workflow (follow this every time, no exceptions)

1. `npx tsc --noEmit`
2. `npm run build`
3. Kill any stale `npm run dev` process on port 3000, restart it
4. `curl localhost:3000/products/<id>` for every product you touched, confirm the rendered output
   matches what you expect (not just "no error" — actually read the price/size/badge text)
5. Only then `git add` the specific files touched, commit with a message that explains *why*, push

This workflow caught real bugs before they shipped (see: empty-array-is-truthy silently zeroing
out 174 products' prices, and the `price_link_only` flag not actually suppressing a computed price
the first time it was added) — do not skip steps to save time.
