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
| 2026-11-11 | Evidence from an online shop's navigation link ("Ceremonial Matcha") counted as a café menu (Loaf, Malta) | Rule: nav/category links, whisks, blog posts, reviews and ingredients are not evidence | Yes, via the full audit |

## Open items from the full audit (not yet applied)
- 6 review batches (0206-0252 partly) were cut off by a usage limit; the weekly task reviews anything in `unaudited_ids.json`.
- 2,263 venues were judged UNSURE; they stay listed until a web check resolves them (policy: resolve, then keep or remove; never leave a doubtful pin indefinitely).
- 961 name-only listings (the name says matcha, nothing on a site) need a web check.
- 39 listings have coordinates far from their own city.

## Pitfalls when editing the pipeline
- Python text written through a shell heredoc can turn `\b` into a backspace character: write regexes with `chr(92)+"b"` or a raw file edit, then check `s.count(chr(8)) == 0`.
- `weekly_refresh.py --allow-drop "reason"` is required when a deliberate rule change removes more than 3% of a region; the reason is logged in the report.
