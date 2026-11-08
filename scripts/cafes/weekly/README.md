# Café data: weekly refresh

`weekly_refresh.py` keeps the café map (`/cafes`) current. It is built to run unattended once a week and **never publishes
unless every check passes**. Working files (place data, crawl results, the Hugging Face token) live in `C:\temp\cafes`,
outside git; everything needed to rebuild them is in this folder.

## What a run does

1. **Sources (monthly, when a newer release exists).** Overture Maps places (`export.py`, `export_intl.py`, `export2.py`)
   and Foursquare OS Places (`fsq_pull_all.py` every café-type venue, `fsq_pull.py` places with matcha in the name, then
   `fsq_all_to_cands.py` / `fsq_to_cands.py`). Release versions are remembered in `overture_release.txt` / `fsq_release.txt`.
2. **Crawl.** `crawl2.cjs` reads each café's own website (homepage, menu/drinks pages, sitemap, PDF menus) and records whether it
   mentions matcha. Each week it re-reads: sites never checked, every site currently listed, sites that failed (until they fail
   4 weeks in a row), and one sixth of the "checked, no matcha" sites (so everything is re-read about every 6 weeks). Honest
   user agent, robots.txt honoured, certificate checks left on.
3. **Build.** `build_all2.py` merges the place sources with the crawl results. Rules worth knowing:
   - Chains are not listed: a website used by 25+ distinct outlets is a chain.
   - A listing needs matcha on the café's own site (or in its own name).
   - Weekly crawl results replace older ones, but a listing is only removed after **two** weekly reads in a row find no
     matcha (a failed fetch never removes anything).
   - Two records for the same café (same website, same spot, similar name) become one.
   - A website that belongs to a group of same-named cafés is not credited to differently named places elsewhere.
4. **Verify.** No region may shrink by more than 3%, JSON must parse, ids must be unique, coordinates valid, and the cafés in
   `gold_cafes.json` must still be listed. Add well-known matcha cafés there whenever you learn of one.
5. **Publish.** Copy to `data/cafes` and `public/data`, `npm run build`, commit, push (Amplify deploys).
6. **Report.** `C:\temp\cafes\weekly_report.json`.

```
python -I weekly_refresh.py                 # full weekly run
python -I weekly_refresh.py --no-crawl      # rebuild and publish from the crawl results already on disk
python -I weekly_refresh.py --no-publish    # do everything except publish
```

## Honest limits

Cafés with no website of their own (about a third of all cafés) cannot be checked by this method. Sites that block
automated readers, show the menu only as an image, or use a login-only ordering app are also missed. New cafés appear when
Overture / Foursquare add them (monthly releases). The weekly web spot-check (a person or Claude searching "best matcha in
&lt;city&gt;" and comparing with the map) finds what these sources miss; add anything it finds to `gold_cafes.json`.
