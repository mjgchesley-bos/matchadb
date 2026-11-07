"""International stores for data/stores.json: (1) DAVIDsTEA's own store list (Canada) and (2) independent retailers whose
own website names a known matcha brand on a page that also says matcha (Overture places + the brand-aware crawl).
usage: python -I build_stores_intl.py path/to/data/stores.json
"""
import json, re, sys, os, duckdb
from collections import Counter
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding="utf-8")
STORES = sys.argv[1]

def slug(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]

def host_of(u):
    try:
        h = urlparse(u if re.match(r'https?://', u) else 'http://' + u).netloc.lower()
    except Exception:
        return None
    return re.sub(r'^www\.', '', h) or None

def clean(s):
    return (str(s) if s is not None else "").replace("\ufffd", "").strip().encode("utf-8", "ignore").decode("utf-8")

out = []
today = "2026-11-06"

# 1. DAVIDsTEA
for p in json.load(open("C:/temp/cafes/davids_places_geo.json", encoding="utf-8")):
    out.append({
        "id": f"davidstea-{slug(p['name'].replace('DAVIDsTEA', ''))}-ca",
        "name": p["name"], "kind": "brand-shop", "address": p["address"], "city": p["city"], "state": "", "zip": p["postal"], "cc": "CA",
        "url": "https://davidstea.com/pages/store-locator", "listedBy": "David's Tea",
        "brands": [{"name": "David's Tea", "evidence": "https://davidstea.com/pages/store-locator"}],
        **({"note": "This store has a Matcha Bar."} if p["matcha_bar"] else {}),
        "checked": today, "lat": p["lat"], "lng": p["lng"],
    })

# 2. independent retailers
res = {}
for fn in ("crawl_stores.jsonl", "crawl_stores_retry.jsonl"):
    if not os.path.exists("C:/temp/cafes/" + fn): continue
    for line in open("C:/temp/cafes/" + fn, encoding="utf-8"):
        line = line.strip()
        if not line: continue
        try: r = json.loads(line)
        except Exception: continue
        if fn.endswith("retry.jsonl") and r.get("status") != "ok" and r["host"] in res: continue
        res[r["host"]] = r
con = duckdb.connect()
rows = con.execute("""SELECT id, name, cat, cc, address, city, state, zip, lat, lng, website, confidence
                      FROM 'C:/temp/cafes/intl_stores.parquet' WHERE website IS NOT NULL AND name IS NOT NULL""").fetchall()
seen = set()
n_host = Counter()
for (id_, name, cat, cc, address, city, state, zip_, lat, lng, website, conf) in rows:
    r = res.get(host_of(website))
    if not r or r.get("status") != "ok" or not r.get("matcha") or not r.get("brands"): continue
    if conf is not None and conf < 0.3: continue
    name = clean(name)
    if not name: continue
    sh = host_of(website)
    brands = [{"name": b, "evidence": v["u"]} for b, v in r["brands"].items() if host_of(v["u"]) == sh]
    if not brands: continue
    # a retailer that names more than a handful of brands is a listing page, not a stockist claim: keep the first few
    brands = brands[:6]
    sid = f"{slug(name)}-{slug(city) or 'x'}-{cc.lower()}-{id_.replace('-', '')[:8]}"
    if sid in seen: continue
    seen.add(sid)
    n_host[host_of(website)] += 1
    out.append({
        "id": sid, "name": name, "kind": "cafe" if cat in ("tea_room",) else "retailer",
        "address": clean(address), "city": clean(city), "state": "", "zip": clean(zip_)[:12], "cc": cc,
        "url": website.split("?")[0], "brands": brands, "checked": r["at"], "lat": round(lat, 6), "lng": round(lng, 6),
    })
# the same site used by many locations (a small chain): fine, but cap at 25 per site so one site can't dominate
keep, count = [], Counter()
for s in out:
    h = host_of(s["url"]) or s["id"]
    count[h] += 1
    if s["listedBy" if "listedBy" in s else "id"] and s.get("listedBy") is None and count[h] > 25: continue
    keep.append(s)
out = keep

existing = json.load(open(STORES, encoding="utf-8"))
base = [s for s in existing if not s.get("cc") or s["cc"] == "US"]
merged = base + out
json.dump(merged, open(STORES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(STORES, "a", encoding="utf-8").write("\n")
print("US stores kept", len(base), "international added", len(out), "->", len(merged))
print(Counter(s["cc"] for s in out).most_common(12))
print(Counter(b["name"] for s in out for b in s["brands"]).most_common(12))
