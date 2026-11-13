"""Names and removal reasons for venues taken off the map, so the staff activity log can say what happened
when a member rated or commented on a café that is no longer listed (instead of showing a bare id).
Writes data/cafes-removed.json: {id: [name, city, country, reason]}. Run after each build."""
import json, glob, os, sys
import pyarrow.parquet as pq
REPO = "C:/Users/mjgch/projects/matchadb"
W = "C:/temp/weekly/"
led = json.load(open(W + "audit_ledger.json", encoding="utf-8"))["decisions"]
md = json.load(open(W + "manual_decisions.json", encoding="utf-8"))
removed = {}
for i, v in {**led, **md}.items():
    if v.get("d") == "REMOVE": removed[i] = (v.get("r") or "")[:80]
live = set()
for f in glob.glob(f"{REPO}/data/cafes/*.json"):
    try:
        for c in json.load(open(f, encoding="utf-8")): live.add(c["id"])
    except Exception: pass
removed = {i: r for i, r in removed.items() if i not in live}
names = {}
for f in glob.glob("C:/temp/cafes/*.parquet"):
    t = pq.read_table(f); cols = t.column_names
    if "name" not in cols: continue
    if "id" in cols:
        ids = [str(x).replace("-", "")[:10] for x in t.column("id").to_pylist()]
        city = t.column("city").to_pylist() if "city" in cols else [""] * len(ids)
        cc = t.column("cc").to_pylist() if "cc" in cols else [""] * len(ids)
    elif "fsq_place_id" in cols:
        ids = ["fsq" + x[:7] for x in t.column("fsq_place_id").to_pylist()]
        city = t.column("locality").to_pylist() if "locality" in cols else [""] * len(ids)
        cc = t.column("country").to_pylist() if "country" in cols else [""] * len(ids)
    else: continue
    nm = t.column("name").to_pylist()
    for k, n, c, o in zip(ids, nm, city, cc):
        if k in removed and k not in names and n: names[k] = [n, c or "", o or ""]
out = {i: names[i] + [removed[i]] for i in removed if i in names}
# leads removed later keep their own record in leads_venues.json
for f in (W + "leads_venues.json",):
    for c in json.load(open(f, encoding="utf-8")):
        if c["id"] in removed and c["id"] not in out: out[c["id"]] = [c["name"], c.get("city") or "", c.get("cc") or "", removed[c["id"]]]
p = f"{REPO}/data/cafes-removed.json"
json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"removed venues with a name: {len(out)} of {len(removed)}; {os.path.getsize(p)/1024:.0f} KB")
