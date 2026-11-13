# Why wrong listings get on the map: root causes (measured 2026-11-14)

Source: `weekly/manual_decisions.json` (every removal a person or a checked agent recorded, with its reason) and `weekly/audit_ledger.json`
(automated review verdicts). Analysis script: classify each reason into a cause; labels are the venues' own audit outcomes.

## 1. What gets removed, by cause

One-by-one city/country audits (Austin, NYC, Slovenia, NZ, Tauranga, Boston + North Shore, Poland): 658 removals after a venue-by-venue check.

| Share | Cause | What it looks like |
|---|---|---|
| 26% | Chain (25+ outlets) | Czas na Herbatę, BuBu Tea, Läderach, Xing Fu Tang... Chains hide below the 25-row filter because we only list outlets that serve matcha, so a brand with 21 rows can have 50 real outlets. |
| 14% | No matcha drink on its own menu (now) | Stale crawl evidence, a sibling location's menu, a shared page, a seasonal drink, a menu that changed. |
| 13% | Retail / online shop / wholesaler | A tea shop's "Matcha" category is powder for sale, not a drink. Worst in Poland (62 of 360). |
| 12% | Dessert only | Cake, ice-cream flavour, chocolate, mochi, macaron, cocktail. |
| 10% | Duplicate | Same shop under two sources, Warszawa/Warsaw, two names for one address. |
| 8% | Unverifiable | No website and no web trace (many small "matcha bars" from place data). |
| 7% | Closed / moved / rebranded / replaced | See section 3: most closures are NOT visible on the venue's own site. |
| 2% | Wrong business or wrong location | Site belongs to another business or country; address not on the brand's own location list. |
| 1% | Not a fixed venue | Trucks, pop-ups, cottage bakeries, events. |

Removal share of everything checked by hand: Poland 73%, Tauranga 72%, Austin 53%, NYC 51%, Boston 47%, Slovenia 25%, NZ 10% (NZ was a rules-only pass, so under-counted).
Earlier automated review (2,660 removals): 27% matcha only in a review/blog/article/pairing, 17% retail/supplier, 9% dessert, 8% wrong business/location, 3% not a fixed venue, 2% not a food venue.
Restaurant rule (matcha only as dessert/cocktail/food): 4,616 removals.

## 2. Why it happens (root cause, not symptom)
1. Auto-acceptance reads a matcha word near a menu-ish word. It cannot tell a drink from a product, a dessert, or another venue's page.
2. The chain filter counts only outlets we list, not real outlets.
3. Place data (Overture, Foursquare) carries venues that closed after the record was last refreshed.
4. Marketplaces, directories and sibling-location pages get used as one venue's evidence.

## 3. Closed businesses: what predicts them (tested on 42 known-closed vs 615 verified-open venues)
- The venue's own website is a poor closure detector: only about 20% of known-closed venues showed any own-site signal; most sites stay up. Closure was learned from Yelp/Google, not the site.
- Own-site signals tested (lift = how much likelier for closed than for open venues): redirect to another domain 3.1x (but 5% of open venues also redirect: rebrands, new domains), dead/404/parked 2.4x (rare), closure wording 0.8x, old copyright year 0.5x, tiny page 0.3x. None is reliable alone.
- Strongest predictor found: the Foursquare record's `date_refreshed`. Of Foursquare-sourced venues, 5 of 7 known-closed had not been refreshed for 12+ months, against 8 of 73 open ones (about 6x). 1,582 of 6,880 Foursquare-sourced listings are that stale.
- Overture-sourced venues (30,470) carry no refresh date in our export: add `sources[].update_time` to the export to get the same signal.
- Because the source data already drops places flagged closed (`operating_status = 'open'`, `date_closed IS NULL`), every closed venue still listed is one the source does not know is closed.

## 4. Permanent changes that follow
- Chains: look up the real outlet count for every brand with 8+ rows (`audit/chain_prompt.md`), add CHAINs to `chain_hosts.json`/name list, remove every outlet; select chains stay exempt.
- Closure: weekly re-check of source-stale venues (`audit/closed_prompt.md`); never trust the own site alone; `closure_scan.cjs` is a prioritiser (dead/parked/redirect), not proof.
- Duplicates: de-duplicate on name + street number + city (never on a truncated address); only same-name pairs are removed automatically.
- Tea shops, bakeries and dessert shops: a "Matcha" category or cake is not a drink.
- Unverifiable listings (no site, no trace) stay off the map.
