# Map accuracy: lessons ledger

Rule: **a mistake found once is fixed everywhere, and fixed so it cannot return.** Every time a wrong listing, a missed listing or a pipeline bug is found,
add a row here, make the permanent change (a build rule, an invariant, a regression case or a scheduled step), and sweep the whole map/database for the same problem.
"We fixed that listing" is not a fix. Accuracy of the map is the site's most important property: a wrong pin is worse than a missing one.

Where permanent rules live:
- `weekly/build_all2.py`: filters (`NOT_CAFE_HOSTS`, `NOT_CAFE_NAME`, `EV_BAD_HOSTS`, `DROP_IDS`, evidence rules) and the audit ledger step.
- `weekly/audit_ledger.json`: per-venue decisions from the reviews (REMOVE ids never come back; unaudited ids are written to `unaudited_ids.json`).
- `weekly/invariants.py` + `weekly/regression_cases.json`: checks run on every build by `weekly_refresh.py`; a failure blocks publishing.
- `audit/` (outside git, in `C:/temp/cafes/audit`): crawler `verify.cjs`, classifier `classify.py`, `stageB.py`, reviewer rules `REVIEW_PROMPT.md`.

| Date | What went wrong | Permanent change | Swept the whole map? |
|---|---|---|---|
| 2026-11-12 | Suggestion with a unit number ("#106", "Suite 100") was rejected: "address could not be located" | `clean_addr()` in `suggestions/review_prepare.py` strips unit designators before geocoding | Re-ran earlier rejections; only the bank branch stays rejected |
| 2026-11-12 | Address typo from a source record ("3701$ Guadalupe") reached the map | `invariants.address_sanity` blocks publishing on junk characters in any address | Yes, all 43k listings |
| 2026-11-12 | Scraped directories and multi-tenant platforms (mapsu.me, lominu.com, bizsite.link, shop.joe.coffee, meniudigital.ro...) made one page's matcha text the "evidence" for dozens of unrelated venues | Hosts blocked in `NOT_CAFE_HOSTS` / `EV_BAD_HOSTS`; `invariants.shared_evidence` blocks publishing when 3+ unrelated venues share one evidence page | Yes (~250 venues removed worldwide) |
| 2026-11-12 | Matcha evidence that was only a whisk, a blog post, a review quote, an ingredient, a hotel-group page, or a Swedish verb ("matcha" = to match) | `audit/classify.py` + `REVIEW_PROMPT.md` rules; every reviewer REMOVE is stored in `audit_ledger.json` | Yes: all 45.8k listings re-read live; 247 of 253 review batches applied |
| 2026-11-12 | Non-venues listed (clinic, gas station, supplier, equipment repair, parcel pickup point, clothing colour "Matcha") | `NOT_CAFE_NAME`/`NOT_CAFE_HOSTS` additions, `regression_cases.json` entries; ledger removals | Yes |
| 2026-11-12 | A member's suggestion sat for hours: suggestions were only reviewed in the weekly run | Daily suggestion review task (`matchadb-daily-suggestion-review`) | n/a |
| 2026-11-12 | Café rebranded (Ding Tea -> Omega Tea Lab, Anaheim Hills); owner emailed a correction; source data still had the old name | `weekly/corrections.json` (verified renames/website/phone/address applied on every build). Rule: confirm independently before applying; never act on the email alone | Searched for the new name across sources; no other listing affected |
| 2026-11-12 | Restaurants (esp. Japanese) listed because matcha appeared only as ice cream, dessert, cocktail or flavour (e.g. a sushi place's mochi ice cream) | Owner rule: a restaurant/bar is listed only if it serves matcha tea or lattes. `weekly/restaurant_rule.py` (drink detector) + `restaurant_ok.json` + build step; 4,620 restaurant listings removed via the ledger | Yes, all 7,388 restaurant-type venues |
| 2026-11-12 | A random 600-venue spot-check of listings the classifier auto-accepted found ~7.5% wrong (reviews, blogs, recipes, suppliers, other businesses' sites, event pop-ups, chains) and ~5% doubtful; deterministic flags only catch about a third of them | Auto-acceptance is a first pass, not proof. Recommended: a full second review of all auto-accepted listings (the owner decides). The 45 failures in the sample were removed via the ledger | Sample only; full pass pending |
| 2026-11-12 | Cheap reviewers (haiku) cannot read a single-line 100 KB JSON file and then guess the rest; and mark known matcha-named venues (Love Lamp Matcha, Matcha Komachi) as no-evidence | Batch files are JSON Lines (one unit per line, 25 units); outputs are validated against input keys; venues with matcha in their own name are protected from weak-evidence removals (still removed if closed/chain/not-a-venue); gold_cafes.json prunes entries proven closed | Yes |
| 2026-11-11 | Evidence from an online shop's navigation link ("Ceremonial Matcha") counted as a café menu (Loaf, Malta) | Rule: nav/category links, whisks, blog posts, reviews and ingredients are not evidence | Yes, via the full audit |

## Open items from the full audit (not yet applied)
- 6 review batches (0206-0252 partly) were cut off by a usage limit; the weekly task reviews anything in `unaudited_ids.json`.
- 2,263 venues were judged UNSURE; they stay listed until a web check resolves them (policy: resolve, then keep or remove; never leave a doubtful pin indefinitely).
- 961 name-only listings (the name says matcha, nothing on a site) need a web check.
- 39 listings have coordinates far from their own city.

## Country audits (Slovenia, 2026-11-12)
Done by hand for a country the owner cares about: every listing checked live, then web search for venues we were missing. Findings and permanent rules:
- A festival / event organiser (Karavana okusov, a travelling food-truck festival) was listed as a venue: events, pop-up stands and market stalls (amaii.matcha) are never listed, only fixed addresses.
- A factory's local arm (Loison, Italian panettone bakery) was listed: bakery/food producers are not cafés unless the page shows a drink menu.
- One shop appeared twice (CHA / Čajna Hiša Pod Velbom, Stari most) because two sources gave it different names: same site + same street = one listing.
- A social-feed teaser ("everyone talks about matcha lattes…") is not menu evidence (Green Republic): unsure -> remove.
- Our data MISSED 4 real matcha cafés in a 20-listing country (Munchies x2, TINK, Kavarna Midva) plus Rooster Coffee and M&K Matcha Kava: place data under-covers small countries. Before announcing a country, search "matcha latte <city>" per main city and add what is verified (leads_venues.json, via "audit").
- Two venues on neighbouring street numbers geocoded to the same point: always look each venue up separately (OSM POI) so two pins never sit on one spot.

## City audit (Austin, 2026-11-12)
134 listings checked, 21 removed, 21 added, 5 pins/names corrected. Permanent rules:
- A page that names ONE venue (a university "guide to campus coffee shops") must never be evidence for every venue it links to: five UT dining cafes were listed on the strength of a sentence about Up and Atom. The shared-evidence invariant now has a regression case; add the real venue instead (Up and Atom added).
- Franchise chains slip through the name-frequency chain rule when each outlet has a different suffix ("Sharetea - Austin", "Mochinut Cedar Park"): check real-world outlet counts for franchise brands (Mochinut, Happy Lemon, Sharetea) by hand.
- A supplier or "current partners" banner (Míra Matcha on Lone Man's home page) is not evidence either way: check the venue's online-order menu before deciding. Lone Man does list a matcha latte, so it stays.
- Retail matcha powder or whisk on a roaster's shop page (Anderson's, Medici) is not a matcha drink: remove unless a drink menu shows one.
- Rebrands and moved venues leave wrong names/addresses: Mañana's second shop is now Mattina; Paperboy's real shops are 1401 S Lamar and 1203 E 11th, not a Menchaca trailer; Matcha Boys moved into The LOOP in Hyde Park.
- City audit found ~20 real matcha cafés missing (CaPhê.in, Black Fox, Terrible Love, Desnudo, Civil Goat, Neon Belly...). The reliable discovery sources are local "best matcha in <city>" roundups (food-blog guides, newspaper lists, Yelp top-10), each venue then verified on its own menu or ordering page.
- Mobile carts and pop-ups with no fixed address (Matchara, Joy(n) Handcrafted) and closed businesses (Freewheelin') stay off the map.

## Select chains and image-only menus (Caffe Medici, 2026-11-12)
- The owner can ask for specific chains on the map. They go in `scripts/cafes/weekly/select_chains.json` (website host per brand): the host is exempt from the three chain filters in `build_all2.py`, but every outlet still needs matcha evidence. Outlets the place data lacks are added as leads. The "no chains" rule stays the default.
- I wrongly removed Caffe Medici in the Austin audit: its own site menu is an image, so a text search found no matcha. Its own Instagram/Facebook menu posts (Cherry Blossom Matcha, White Pumpkin Matcha Latte) are valid evidence. Rule: before removing a venue for "no matcha on site", check its own social menu posts and online-order page, not only the website text.

## Pitfalls when editing the pipeline
- Python text written through a shell heredoc can turn `\b` into a backspace character: write regexes with `chr(92)+"b"` or a raw file edit, then check `s.count(chr(8)) == 0`.
- `weekly_refresh.py --allow-drop "reason"` is required when a deliberate rule change removes more than 3% of a region; the reason is logged in the report.
