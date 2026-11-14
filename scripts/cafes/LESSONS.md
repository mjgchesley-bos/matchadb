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

## City audit (New York City, 2026-11-12)
820 listings inside the five boroughs: 123 removed, 11 added, 4 addresses fixed. Permanent rules:
- Closed businesses stay on the map until someone checks: at least 9 listings were marked permanently closed on Yelp or the venue's own site (Gertie, Paper Plane, Ellary's Greens, Brooklyn Whiskers...). A closed-business check (own-site "permanently closed" text, Yelp CLOSED label) belongs in the weekly review of any city we promote.
- Venues in other places sat inside the NYC box because the place data put the wrong city on them (Warwick, Hempstead, Pelham and Port Washington listings shown in Brooklyn/Queens). Check that the street address's own town matches the pin's town before trusting a pin.
- Stale branch lists: three Madman Espresso locations and one Matchaful location were not on the brand's current location list. For multi-outlet local brands, compare each outlet with the brand's own location page.
- Restaurants: matcha as a cocktail, a dessert, a curry or a packaged mochi is not a matcha tea/latte (Double Knot, Ootoya, Peacefood, Davelle, Dr. Clark, Wasabi Sushi, Sake Bar Hagi).
- Chocolatiers and patisseries whose only matcha is a chocolate flavour or a loaf slice (Chocolat Moderne, Stick With Me, Colson) are not matcha venues; retail powder on a tea seller's site (Harney, Felix, Ants, Bird and Branch) is not a drink.
- Food trucks, carts and pop-ups (Ginvee, DewMatcha) and cottage bakeries with no storefront (Studio Sweetly) stay off the map.
- Local multi-outlet brands over 25 outlets (Fay Da, T-Swirl, Yaya Tea, Xing Fu Tang, Royce, Läderach, Yi Fang, Fresh & Co, Café Kitsuné) are chains.
- Many NYC venues keep their menu as an image or on an ordering platform: text re-checks wrongly flagged them, so a haiku agent verified each flagged venue through search and the ordering page. Verdicts the agent could not confirm ("unsure") were removed unless a stored own-site menu line plus confirmed-open status existed.
- Discovery: local roundups (Eater, Time Out, Reddit, Yelp top-10) mostly named venues we already had; the new ones came from brand location pages (Matchaful, Rhythm Zero) rather than roundups.

## Adding a country (New Zealand, 2026-11-13)
- A new country = a new region in four places: `export_<cc>.py` (Overture + Foursquare pull) and its parquet names in `build_all2.py` / `weekly_refresh.py`, `region_of` + `CC3` in `build_all2.py`, `src/lib/cafe-regions.ts` + `CC3` in `src/lib/cafe-types.ts`, and `c.region.<key>` / `.ph` in all 7 dictionaries (plus the slim-file lists in `build_all2.py`, `weekly_refresh.py`, `AccountClient.tsx`).
- The crawler (`crawl2.cjs`) hung at 100% CPU on large pages: the link regex `<a ...>([\s\S]*?)</a>` rescanned the whole page for every unclosed `<a`. The pattern is now bounded. Still, a single hanging site can freeze every worker, so crawl new countries with a supervisor that runs small batches in separate processes and kills any batch that stalls (`C:	emp
z_super.py` pattern: 25 hosts per process, 150 s limit, singles retried at 60 s, then recorded as status "hang").
- Many NZ sites time out when fetched from outside NZ (about a third failed first time): re-crawl the failures once before judging coverage.
- A regression case that names a chain must be backed by a whole-map sweep of that chain, or the publish gate (correctly) blocks: the NYC audit removed Xing Fu Tang / Fay Da / T-Swirl / Yaya Tea only in NYC; the gate caught the other 35 outlets worldwide.
- Discovery for a small country is thin without own-site menus: tourism boards (christchurchnz.com, wellingtonnz.com) and the Urban List publish matcha guides that name venues, but the venue's address and menu still need confirming (OpenStreetMap POI check worked well for addresses).

## Small-town audit (Tauranga NZ, 2026-11-13)
- Stored crawl evidence can be stale even when it was captured this week: the Café Botannix menu with a matcha latte came from another location's page that no longer mentions matcha, and the same page was reused as evidence for three Tauranga cafés. Confirm each listing on ITS OWN live menu page before trusting it; a sibling location's page is not evidence.
- JavaScript menus: a plain fetch sees nothing, so use the in-app browser (read `document.body.innerText`) to check them. It confirmed Kneed Bakery, Pearl Kitchen and Soul Boul in one batch of calls.
- A site that now redirects to a different business (vitalityorganics.nz to vitalitykitchen.co.nz) means the old listing is merged or closed: remove it unless the new site shows matcha.
- Directory sites (MyLocalMatcha, matchanearme) are leads only: all 15 Tauranga candidates from them failed the own-menu test or lacked a street address.

## City audit (Boston and the North Shore to Haverhill, 2026-11-13)
254 listings in the Boston to Haverhill box: 119 removed, 22 added, 4 addresses fixed (248 verified one by one; 6 chains/dessert shops dropped up front). Permanent rules:
- A shared WebFetch rate limit and Toast 403s left 92 of 248 verdicts "unsure". Do not leave unsure to the agents: re-check them yourself. A plain Python fetch (browser User-Agent, no rate limit) resolved about 60 of them in one pass; the built-in browser (`document.body.innerText` on the venue's order.toasttab.com page) resolved most of the rest, because Toast order pages load fine there.
- The venue's own Toast/Square/Clover ordering page is the best matcha evidence: Euphoria, Common Ground, Grounder, La Qchara, Olga's and Ripple only showed matcha there, never on the plain website.
- Closed or replaced businesses again sat on the map: Home.stead (closed June 2026), Short Stop Cafe (closed 2022), Knight Moves Somerville, Dudley Cafe Cambridge, Reign Drink Lab (domain now another business), Matcha Loves Boba (rebranded), Atomic Café Marblehead (Blue Canoe took the address).
- Wrong business on the pin: Mizu Matcha Cambridge was Moge Tee; Monkey Business Cafe's site is a California business; The Cloud at The Waterfront is in Bermuda; Mia's Brooklyn Bakery only has NYC shops; Quench Juicery's site is a Scituate shop. Check that the venue's own site lists that address.
- Stale branches again: Kaffmandu lists only Danvers; Atomic Café lists only Beverly; swissbakers has two shops; PS Gourmet's Dorchester shop is 514 Gallivan Blvd, not Adams St.
- Dessert/ice-cream/chocolate shops with matcha only as a flavor or a cake (Toscanini's, Honeycomb Creamery, Far Out, Boston Bonbon, Oakleaf Cakes, New Ginza) were removed again. Smoothie bars where matcha is only an ingredient (Grind and Go) were removed; a menu item named for matcha (Juicery "Mint Matcha Chip") was kept.
- Discovery: Toast "local" order pages found by searching "matcha latte <town> MA" produced 22 venues the place data missed. Corporate cafeterias (225 Cafe), museum concessions (PEM Atrium), catering-only menus (The Fika Spot) and shops marked not accepting orders were skipped.
- Danvers (the owner's hometown) has only one confirmed matcha venue (Kaffmandu); Rebel Coffee, Maple St Cafe and Daily Harvest have no matcha menu on their own pages yet.
- After editing manual_decisions.json, rebuild `audit_ledger.json` (`C:	emp\cafesudituild_ledger.py`) and copy it to `C:	emp\weekly` and the repo before running weekly_refresh, or the regression gate reports the removals as "back on the map".

## Country audit (Poland, 2026-11-14)
492 listings: 76 chain/dessert listings removed up front, 416 verified one by one (95 kept, 170 removed, 151 unsure), then the 151 unsure resolved by direct re-checks. Result 138 listings remain; 6 verified venues added. Permanent rules:
- Poland's biggest false-positive family is the tea shop (sklep z herbatą): its "Matcha" category is powder for sale, not a drink. A herbaciarnia or café counts only if it prepares matcha to drink. Online tea shops, roasters and wholesalers with a "Matcha" product (Czajownia, Five O'Clock, Coffeedesk online, Moya Matcha, JAVA) are removed.
- Bakeries and pastry shops (cukiernia) list "tort matcha", "sernik matcha" or a matcha sorbet: dessert only, removed unless a matcha drink is on their menu (Melba does list "Kawa i matcha").
- Polish chains: Czas na Herbatę (50+), BuBu Tea (40+), Lody Bosko, Karmello, Comebuy are chains. White Bear Coffee (about 23 outlets and growing) had no matcha on its own menus: removed. Lajkonik (about 14 bakery-cafés, Kraków and Katowice only) is allowed under the 25-outlet rule; its outlets in Skawina and Sosnowiec are not on its own site and were removed.
- 151 of 416 were "unsure" because of shared rate limits, expired certificates, 403s and sites that are Instagram-only. Re-checking each own site with a plain fetch resolved about 60%; venues with no website and no traceable web presence (many small Warsaw "matcha bars" from place data) were removed under the rule "unverifiable = off the map".
- Discovery in Poland found only 9 new candidates, all with menus only on Wolt/Glovo/Pyszne.pl (delivery marketplaces). A live Wolt/Glovo menu was accepted as evidence for 6 independent venues; Crazy Bubble branches (chain size unknown) and a venue with an ambiguous drink name were skipped.
- My first duplicate check keyed on the first 10 characters of an address and wrongly flagged different venues (Starowiślna 1 vs 82; two shops in one courtyard at Próżna 7). Dedupe on street name AND number, and never reuse the same text-match to "restore" rows.
- Mixed-language data: "Warsaw" and "Warszawa" are separate city strings (and one listing was in Cyrillic): normalise before counting or de-duplicating.

## Whole-database root-cause audit (2026-11-14)
Full numbers in `ROOT_CAUSES.md`. Applied: 30 chain brands with 30+ real outlets (found by looking up the real outlet count of every brand with 8+ rows) removed everywhere (about 420 outlets, plus variant names such as "Läderach Chocolatier Suisse"), and 240 same-name duplicates. Rules learned:
- A brand with 8 to 24 rows in our data can still be a 50-outlet chain (we only list the outlets that serve matcha). Look up real counts; do not rely on our own row counts.
- Closed businesses are mostly invisible from their own websites (only about 20% showed any signal) and the signals that exist false-alarm (a redirect or dead site was truly closed only about 14% of the time). Source staleness is the best predictor (Foursquare `date_refreshed` older than 12 months: about 6x lift; 1,582 listings). Own-site scanning is a prioritiser, never a reason to remove.
- The regression gate caught chain variant names and over-short names ("Itsu" matches "Mitsu"): use the full brand name or a host.
- Web-search budget: a session allows about 200 WebSearch calls, shared by all agents. Big lookups must be sized to that (or the limit raised) before launching; 12 agents exhausted it after about 200 brands and left most brands "unknown".

## Pitfalls when editing the pipeline
- Python text written through a shell heredoc can turn `\b` into a backspace character: write regexes with `chr(92)+"b"` or a raw file edit, then check `s.count(chr(8)) == 0`.
- `weekly_refresh.py --allow-drop "reason"` is required when a deliberate rule change removes more than 3% of a region; the reason is logged in the report.

| 2026-11-13 | Audit removed Leche Coffee (Austin) as "TikTok scrape only, no matcha evidence", but a member had visited, rated it 5.0 and posted a photo; the owner confirmed it is real. | A venue with member activity (rating, comment, photo, favorite) is real evidence that people go there. Audits must never remove one; check `cafe_ratings`, `comments` (target_type cafe) and `favorite_cafes` ids first. Leche added to gold_cafes.json. |
