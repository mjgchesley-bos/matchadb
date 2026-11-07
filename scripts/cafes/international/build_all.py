"""Build the café data for the site from Overture places + the menu crawls.

A café is included only when its OWN website (homepage or a menu / drinks / order page) mentions matcha
(Latin script, or 抹茶 / まっちゃ / マッチャ / 말차). Output:
  <out_dir>/{ST}.json      US states (2 letters), one file per state
  <out_dir>/{CCC}.json     every other country (ISO alpha-3), one file per country
  <slim_dir>/cafes-slim-{region}.json   the map list per region: us, ca, eu, jp, kr

usage: python -I build_all.py OUT_DIR SLIM_DIR
"""
import duckdb, json, re, sys, os, shutil, html
from urllib.parse import urlparse
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
OUT_DIR = sys.argv[1]
SLIM_DIR = sys.argv[2]
SOURCES = [  # (places parquet, [crawl result files, later ones win when they succeeded])
    ("C:/temp/cafes/us_cafes.parquet", ["C:/temp/cafes/crawl.jsonl"], "US"),
    ("C:/temp/cafes/intl_cafes.parquet", ["C:/temp/cafes/crawl_intl.jsonl", "C:/temp/cafes/crawl_intl_retry.jsonl"], None),
]

CC3 = {"CA": "CAN", "JP": "JPN", "KR": "KOR", "GB": "GBR", "IE": "IRL", "FR": "FRA", "DE": "DEU", "IT": "ITA", "ES": "ESP", "PT": "PRT", "NL": "NLD", "BE": "BEL",
       "LU": "LUX", "AT": "AUT", "CH": "CHE", "SE": "SWE", "NO": "NOR", "DK": "DNK", "FI": "FIN", "IS": "ISL", "PL": "POL", "CZ": "CZE", "SK": "SVK", "HU": "HUN",
       "GR": "GRC", "RO": "ROU", "BG": "BGR", "HR": "HRV", "SI": "SVN", "EE": "EST", "LV": "LVA", "LT": "LTU", "MT": "MLT", "CY": "CYP"}
EU = {"GB", "IE", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "LU", "AT", "CH", "SE", "NO", "DK", "FI", "IS", "PL", "CZ", "SK", "HU", "GR", "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY"}

def region_of(cc):
    if cc == "US": return "us"
    if cc == "CA": return "ca"
    if cc == "JP": return "jp"
    if cc == "KR": return "kr"
    return "eu" if cc in EU else None

def host_of(u):
    try:
        h = urlparse(u if re.match(r'https?://', u) else 'http://' + u).netloc.lower()
    except Exception:
        return None
    return re.sub(r'^www\.', '', h) or None

M_WORD = r'(?:\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차)'
M_RE = re.compile(M_WORD, re.I)
ITEM = re.compile(r'"(?:name|title|label|item_name)"\s*:\s*"[^"]*' + M_WORD, re.I)
ITEM_NAME = re.compile(r'"(?:name|title|label|item_name)"\s*:\s*"([^"]*' + M_WORD + r'[^"]*)"', re.I)
NAME_FOCUS = re.compile(r'matcha|抹茶|まっちゃ|マッチャ|말차', re.I)

def clean(s):
    if s is None: return ""
    return str(s).replace("\ufffd", "").strip().encode("utf-8", "ignore").decode("utf-8")

def evidence(r):
    """Best evidence first. st: 3 = text on a menu page, 2 = text on another page, 1 = a menu item in embedded data."""
    out = []
    for h in r.get("hits", []):
        sn = [clean(html.unescape(s)) for s in h.get("snippets", []) if M_RE.search(s)]
        if not sn: continue
        if h["visible"] and h["kind"] == "menu": st = 3
        elif h["visible"]: st = 2
        elif any(ITEM.search(s) for s in sn):
            st = 1
            names = []
            for s in sn:
                m = ITEM_NAME.search(s)
                if m: names.append(m.group(1).replace("\\u0026", "&").replace("\\/", "/"))
            if not names: continue
            sn = names
        else: continue
        out.append({"u": h["url"], "k": h["kind"], "st": st, "n": h["count"], "s": sn[:2]})
    out.sort(key=lambda e: (-e["st"], -e["n"]))
    seen, dedup = set(), []
    for e in out:
        key = re.sub(r'[\W_]+', '', (e["s"][0] if e["s"] else e["u"]).lower())[:80]
        if key in seen: continue
        seen.add(key)
        dedup.append(e)
    return dedup

con = duckdb.connect()
cafes = []
stats = Counter()
crawled = 0
for parquet, crawl_files, fixed_cc in SOURCES:
    res = {}
    for cf in crawl_files:
        if not os.path.exists(cf): continue
        for line in open(cf, encoding="utf8"):
            line = line.strip()
            if not line: continue
            try: r = json.loads(line)
            except Exception: continue
            old = res.get(r["host"])
            if old and old.get("status") == "ok" and r.get("status") != "ok": continue
            res[r["host"]] = r
    crawled += len(res)
    cc_expr = f"'{fixed_cc}' AS cc" if fixed_cc else "cc"
    rows = con.execute(f"""SELECT id, name, cat, {cc_expr}, address, city, state, zip, lat, lng, website, phone, confidence, brand_wikidata
                           FROM '{parquet}' WHERE website IS NOT NULL AND name IS NOT NULL""").fetchall()
    brand_count = Counter(r[13] for r in rows if r[13])
    for (id_, name, cat, cc, address, city, state, zip_, lat, lng, website, phone, conf, wd) in rows:
        if cat == "internet_cafe": continue
        if cc == "US" and not state: continue
        if region_of(cc) is None: continue
        r = res.get(host_of(website))
        if not r or r.get("status") != "ok" or not r.get("matcha"): continue
        ev = evidence(r)
        if not ev: continue
        if wd and brand_count[wd] >= 15: continue                       # big chains are handled separately
        if conf is not None and conf < 0.3: continue
        name = clean(name)
        if not name: continue
        focus = bool(NAME_FOCUS.search(name)) or any(e["st"] >= 2 and e["n"] >= 12 for e in ev)
        us = cc == "US"
        cafes.append({
            "id": id_.replace("-", "")[:10], "name": name, "cat": cat, "cc": cc,
            "address": clean(address), "city": clean(city), "state": clean(state) if us else "", "zip": clean(zip_)[:5] if us else clean(zip_)[:12],
            "lat": round(lat, 5), "lng": round(lng, 5),
            "url": website.split("?")[0], "phone": clean(phone) or None,
            "focus": focus, "ev": [{**e, "s": e["s"][: (3 if i == 0 else 1)]} for i, e in enumerate(ev[:2])],
            "menu": next((e["u"] for e in ev if e["k"] == "menu"), None),
            "platform": r.get("platform"), "pdf": r.get("pdf"), "checked": r["at"], "conf": round(conf or 0, 2), "shared": 0,
        })

# near-duplicates: same name within ~150 m
def norm(s): return re.sub(r'[\W_]+', '', s.lower())
cafes.sort(key=lambda c: -c["conf"])
kept, seen = [], {}
for c in cafes:
    key = norm(c["name"]) or c["id"]
    if any(abs(o["lat"] - c["lat"]) < 0.0015 and abs(o["lng"] - c["lng"]) < 0.002 for o in seen.get(key, [])): continue
    seen.setdefault(key, []).append(c)
    kept.append(c)
cafes = kept

by_host = {}
for c in cafes: by_host.setdefault(host_of(c["url"]), []).append(c)
for cs in by_host.values():
    for c in cs: c["shared"] = len(cs)

ids = [c["id"] for c in cafes]
dups = [i for i, n in Counter(ids).items() if n > 1]
if dups:
    # extremely unlikely: drop later duplicates rather than break the site's id rule
    seen_ids, uniq = set(), []
    for c in cafes:
        if c["id"] in seen_ids: continue
        seen_ids.add(c["id"]); uniq.append(c)
    cafes = uniq
    print("dropped duplicate ids:", len(dups))

for c in cafes: c["_key"] = c["state"] if c["cc"] == "US" else CC3[c["cc"]]
cafes.sort(key=lambda c: (c["_key"], c["city"], c["name"]))
if os.path.isdir(OUT_DIR): shutil.rmtree(OUT_DIR)
os.makedirs(OUT_DIR)
os.makedirs(SLIM_DIR, exist_ok=True)
files = {}
for c in cafes:
    k = c.pop("_key")
    files.setdefault(k, []).append(c)
for k, cs in files.items():
    json.dump(cs, open(os.path.join(OUT_DIR, f"{k}.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)
slims = {}
for c in cafes:
    slims.setdefault(region_of(c["cc"]), []).append([c["id"], c["name"], c["address"], c["city"], c["state"], c["zip"], c["lat"], c["lng"], 1 if c["focus"] else 0, c["cc"]])
for reg in ("us", "ca", "eu", "jp", "kr"):
    json.dump(slims.get(reg, []), open(os.path.join(SLIM_DIR, f"cafes-slim-{reg}.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)

print(f"hosts crawled {crawled}; cafés with matcha on their own site: {len(cafes)} (matcha-focused {sum(c['focus'] for c in cafes)})")
print("by region", {k: len(v) for k, v in slims.items()})
print("by country", Counter(c["cc"] for c in cafes).most_common(14))
print("evidence strength", Counter(max(e["st"] for e in c["ev"]) for c in cafes))
print("files", len(files), "full KB", sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR)) // 1024,
      "slim KB", {k: os.path.getsize(os.path.join(SLIM_DIR, f"cafes-slim-{k}.json")) // 1024 for k in ("us", "ca", "eu", "jp", "kr")})
