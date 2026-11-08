
## Foursquare (added 2026-11-07)
`fsq_pull.py` reads Foursquare's open places (gated Hugging Face dataset `foursquare/fsq-os-places`; token in `C:\temp\cafes\hf_token.txt`, never committed)
and keeps open places with matcha in the name. `fsq_to_cands.py` turns them into `fsq_cands.parquet`, which `build_all2.py` reads like the Overture
files. They list as name-only (`via: "name"`); a name-only listing within ~1 km of the same café's other record is dropped as a duplicate.
