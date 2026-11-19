"""Builds data/cafe-redirects.json: a venue removed as a duplicate points to the listing that stayed (so its old page forwards there instead of 'not found').
Reads data/cafes-removed.json (reason text) and data/cafes/*.json. Run after each café refresh:  python scripts/build-redirects.py"""
import json, glob, re, os, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def norm(s): return re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower())
listed = {}
for f in glob.glob(os.path.join(ROOT, "data", "cafes", "*.json")):
    for c in json.load(open(f, encoding="utf-8")): listed[c["id"]] = c
by_name = {}
for c in listed.values():
    by_name.setdefault((norm(re.sub(r"\s*\(.*\)$", "", c["name"])), norm(c.get("city"))), []).append(c["id"])
rem = json.load(open(os.path.join(ROOT, "data", "cafes-removed.json"), encoding="utf-8"))
out = {}
for i, v in rem.items():
    r = v[3] or ""
    if "duplicate" not in r.lower() or i in listed: continue
    m = re.search(r"duplicate of ((?:fsq[0-9a-f]{7})|[0-9a-f]{10})\b", r)
    if m and m.group(1) in listed: out[i] = m.group(1); continue
    cands = by_name.get((norm(v[0]), norm(v[1])), [])
    if len(cands) == 1: out[i] = cands[0]
json.dump(out, open(os.path.join(ROOT, "data", "cafe-redirects.json"), "w"), separators=(",", ":"))
print(len(out), "redirects of", sum(1 for v in rem.values() if "duplicate" in (v[3] or "").lower()), "duplicate removals")
