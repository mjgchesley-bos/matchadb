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
