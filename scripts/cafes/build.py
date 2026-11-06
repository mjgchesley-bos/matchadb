"""Build data/cafes.json (full) and public/data/cafes-slim.json (map list) from the Overture export and the
menu crawl. A cafe is included only when its OWN website (homepage or a menu/drinks/order page) mentions matcha."""
import duckdb, json, re, sys, math
from urllib.parse import urlparse
from datetime import date

OUT_FULL = sys.argv[1] if len(sys.argv) > 1 else "C:/temp/cafes/cafes.json"
OUT_SLIM = sys.argv[2] if len(sys.argv) > 2 else "C:/temp/cafes/cafes-slim.json"
CRAWL = sys.argv[3] if len(sys.argv) > 3 else "C:/temp/cafes/crawl.jsonl"

def host_of(u):
    try:
        h = urlparse(u if re.match(r'https?://', u) else 'http://' + u).netloc.lower()
    except Exception:
        return None
    return re.sub(r'^www\.', '', h) or None

# ---- crawl results: latest per host
res = {}
for line in open(CRAWL, encoding="utf8"):
    line = line.strip()
    if not line: continue
    try: r = json.loads(line)
    except Exception: continue
    res[r["host"]] = r

ITEM = re.compile(r'"(?:name|title|label|item_name)"\s*:\s*"[^"]*\bmatcha', re.I)

def evidence(r):
    """Best evidence hits first. strength: 3 menu page text, 2 other page text, 1 menu item in embedded data."""
    out = []
    for h in r.get("hits", []):
        sn = [s for s in h.get("snippets", []) if re.search(r'\bmatchas?\b', s, re.I)]
        if not sn: continue
        if h["visible"] and h["kind"] == "menu": st = 3
        elif h["visible"]: st = 2
        elif any(ITEM.search(s) for s in sn): st = 1
        else: continue
        out.append({"u": h["url"], "k": h["kind"], "st": st, "n": h["count"], "s": sn[:2]})
    out.sort(key=lambda e: (-e["st"], -e["n"]))
    # the same page reached by two addresses (with and without a trailing slash, or with a tracking suffix)
    seen, dedup = set(), []
    for e in out:
        key = re.sub(r'\W+', '', (e["s"][0] if e["s"] else e["u"]).lower())[:80]
        if key in seen: continue
        seen.add(key)
        dedup.append(e)
    return dedup

con = duckdb.connect()
rows = con.execute("""SELECT id, name, cat, address, city, state, zip, lat, lng, website, phone, confidence, brand, brand_wikidata
                      FROM 'C:/temp/cafes/us_cafes.parquet' WHERE website IS NOT NULL AND name IS NOT NULL AND state IS NOT NULL""").fetchall()
brand_count = {}
for r in rows:
    if r[13]: brand_count[r[13]] = brand_count.get(r[13], 0) + 1

def clean(s):
    if s is None: return ""
    s = str(s).replace("\ufffd", "").strip()
    return s

cafes = []
for (id_, name, cat, address, city, state, zip_, lat, lng, website, phone, conf, brand, wd) in rows:
    if cat in ("internet_cafe",): continue
    h = host_of(website)
    r = res.get(h)
    if not r or r.get("status") != "ok" or not r.get("matcha"): continue
    ev = evidence(r)
    if not ev: continue
    if wd and brand_count.get(wd, 0) >= 15: continue          # big chains are handled separately
    if conf is not None and conf < 0.3: continue
    name = clean(name)
    if not name: continue
    focus = bool(re.search(r'matcha', name, re.I)) or any(e["st"] >= 2 and e["n"] >= 12 for e in ev)
    cafes.append({
        "id": id_.replace("-", "")[:10], "name": name, "cat": cat,
        "address": clean(address), "city": clean(city), "state": clean(state), "zip": clean(zip_)[:5],
        "lat": round(lat, 5), "lng": round(lng, 5),
        "url": website.split("?")[0] if website else None, "phone": clean(phone) or None,
        "focus": focus, "ev": [{**e, "s": e["s"][: (3 if i == 0 else 1)]} for i, e in enumerate(ev[:2])], "menu": next((e["u"] for e in ev if e["k"] == "menu"), None),
        "platform": r.get("platform"), "pdf": r.get("pdf"), "checked": r["at"], "conf": round(conf or 0, 2),
        "shared": 0,
    })

# near-duplicates: same name and within ~150 m
def norm(s): return re.sub(r'[^a-z0-9]', '', s.lower())
cafes.sort(key=lambda c: -c["conf"])
kept, seen = [], {}
for c in cafes:
    key = norm(c["name"])
    dup = False
    for o in seen.get(key, []):
        if abs(o["lat"] - c["lat"]) < 0.0015 and abs(o["lng"] - c["lng"]) < 0.002:
            dup = True; break
    if dup: continue
    seen.setdefault(key, []).append(c)
    kept.append(c)
cafes = kept

# the same website used by several locations
by_host = {}
for c in cafes:
    by_host.setdefault(host_of(c["url"]), []).append(c)
for h, cs in by_host.items():
    for c in cs: c["shared"] = len(cs)

ids = [c["id"] for c in cafes]
assert len(ids) == len(set(ids)), "id collision"
cafes.sort(key=lambda c: (c["state"], c["city"], c["name"]))
import os, shutil
if os.path.isdir(OUT_FULL): shutil.rmtree(OUT_FULL)
os.makedirs(OUT_FULL)
by_state = {}
for c in cafes: by_state.setdefault(c["state"], []).append(c)
for st, cs in by_state.items():
    json.dump(cs, open(os.path.join(OUT_FULL, f"{st}.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
slim = [[c["id"], c["name"], c["address"], c["city"], c["state"], c["zip"], c["lat"], c["lng"], 1 if c["focus"] else 0] for c in cafes]
json.dump(slim, open(OUT_SLIM, "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)

ok = sum(1 for r in res.values() if r.get("status") == "ok")
print(f"hosts crawled {len(res)}, reachable {ok}; cafes with matcha on their own site: {len(cafes)} (focus {sum(c['focus'] for c in cafes)})")
from collections import Counter
print(Counter(max(e["st"] for e in c["ev"]) for c in cafes))
print(Counter(c["state"] for c in cafes).most_common(10))
import os
print("states", len(by_state), "full KB", sum(os.path.getsize(os.path.join(OUT_FULL, f)) for f in os.listdir(OUT_FULL))//1024, "slim KB", os.path.getsize(OUT_SLIM)//1024)
