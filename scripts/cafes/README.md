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
