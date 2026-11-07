# Matcha café pipeline

How `data/cafes/*.json` and `public/data/cafes-slim.json` are built. A café is listed only when its OWN website
(homepage or a menu / drinks / order page) mentions the word "matcha"; the page and a quote are kept as evidence.

1. `export.py`  Pull US cafés, coffee shops, boba shops, tea rooms and roasters from Overture Maps places
   (release set inside the script; needs `pip install duckdb`). Writes `us_cafes.parquet`.
2. `prep.py`    Group by website host. Big chains (a brand with 15+ locations, or a host shared by 25+) are split off;
   social pages are skipped. Writes `hosts.json`.
3. `crawl.cjs`  `node crawl.cjs hosts.json crawl.jsonl 96`. Checks robots.txt, fetches the homepage plus up to 4
   menu/drinks/order pages, looks for the word matcha. Resumable. About 50 minutes for 53k sites.
4. `build.py`   `python -I build.py <repo>/data/cafes <repo>/public/data/cafes-slim.json crawl.jsonl`. Joins the crawl to
   the places, de-duplicates, writes one file per state plus the slim map list.

Known gaps: sites that block bots (Toast, many Wix/Cloudflare sites), menus that are only images or PDFs, JS-only
menus, cafés with only an Instagram/Facebook page. Big chains are not on the map yet. Working files live in C:/temp/cafes.

## International (Canada, Europe, Japan, South Korea) — added 2026-11-06

Scripts in `international/` (they read/write a working folder `C:/temp/cafes`, edit the paths at the top):

1. `export_intl.py` / `prep_intl.py` — pull Overture cafés/tea rooms for CA, 31 European countries, JP, KR and list their websites.
2. `crawl.cjs hosts_intl.json out.jsonl 120` — same own-site rule as the US crawl, with a multilingual matcha regex (matcha, 抹茶, マッチャ, 말차). Re-run failed hosts (429/5xx/timeouts/dead DNS) at lower concurrency into `crawl_intl_retry.jsonl`.
3. `build_all.py data/cafes public/data` — builds `data/cafes/{ST|CCC}.json` and the per-region `public/data/cafes-slim-{us,ca,eu,jp,kr}.json`.
4. Stores: `make_brands.py` → `brands.json`, `crawl_stores.cjs` (a retailer counts only if its own page names a brand AND says matcha), `davids*.py` (DAVIDsTEA's own store locator), `build_stores_intl.py data/stores.json` (keeps US rows, replaces international rows; evidence URL must be on the store's own site).

## v2 — "find every café that lists matcha" (2026-11-07), scripts in `v2/`

Why v2: v1 missed Magick Matcha, Love Lamp Matcha and Merit Coffee Seaholm. Causes: (a) only café-type Overture categories were
searched (Love Lamp has no category at all), (b) hosts that answered 429 / timed out were never retried, (c) only the homepage and
a few menu links were read (Merit's matcha is on its location pages), (d) places whose NAME says matcha were dropped unless the site
also said it, (e) places missing from Overture (Magick Matcha) never entered the pipeline.

1. `export2.py` / `prep2.py` — extended candidate set: every Overture place that has a website and is food/drink/dessert/bakery/etc., or whose
   name contains matcha in any category. Skips hosts already known to be dead (404/410/robots) and chains (brand ≥15 locations or host ≥25).
2. `crawl2.cjs hosts.json out.jsonl 100` — retries with backoff on 429/5xx/timeouts, www/scheme variants, follows the Locations / Cafés index
   and its sibling pages, ranks sitemap pages (menu/drinks/locations first), probes common paths when the site is thin, honest UA, robots.txt
   with wildcards, 70 s deadline per host. Run at concurrency ≤100: above that Node starves (ENOBUFS / EAI_AGAIN) and live sites show up as "TypeError".
3. `best_status.py` + `dns_filter.cjs` — collect hosts that still failed, drop the ones whose DNS is gone, re-crawl the rest gently (`run_r1.sh`).
4. Leads from outside Overture: `cc_hosts.py` queries the Common Crawl columnar index for registered domains with "matcha" in the hostname;
   `mk_leads.py` → `enrich_leads.cjs` reads each site's JSON-LD / printed street address / hours; `mk_venues.py` keeps real storefronts in supported
   countries whose own site says matcha as a whole word in its name, and geocodes with OpenStreetMap Nominatim (ODbL, 1 req/s, cached).
5. `build_all2.py OUT_DIR SLIM_DIR` — merges every crawl file (best result per host wins), applies the own-site rule, lists a place on its name alone
   when matcha is in the business name (`via: "name"`, badge "Matcha in the name", no invented quote), adds the lead venues. Evidence strength `st`:
   3 menu-page text, 2 other page text, 1 menu item in embedded JSON, 0 name only.

Still not covered: places absent from Overture AND without a matcha-named domain (Foursquare OS Places or a search API would be the next source),
menus that are images/PDFs/JS-only, bot-blocked sites, big chains.
