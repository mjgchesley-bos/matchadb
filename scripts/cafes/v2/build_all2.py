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
CRAWL_FILES = [f"C:/temp/cafes/{n}" for n in ("crawl.jsonl", "crawl_intl.jsonl", "crawl_intl_retry.jsonl", "v2_a.jsonl", "v2_a2.jsonl", "v2_b.jsonl", "v2_c.jsonl", "v2_r1.jsonl", "v2_r2.jsonl", "v2_r3.jsonl", "v2_leads.jsonl")]
PLACES = ["C:/temp/cafes/us_cafes.parquet", "C:/temp/cafes/intl_cafes.parquet", "C:/temp/cafes/ext_cands.parquet"]
LEADS_FILE = "C:/temp/cafes/leads_venues.json"      # venues found through web leads (not in Overture): already in café shape
# categories where "matcha" in the business name is enough to list it (the name is its own claim)
NAME_CATS = {None, "cafe", "coffee_shop", "tea_room", "bubble_tea_shop", "coffee_roastery", "dessert_shop", "ice_cream_shop", "gelato_shop", "smoothie_juice_bar",
             "juice_bar", "bakery", "donut_shop", "creperie", "breakfast_and_brunch_restaurant", "restaurant", "japanese_restaurant", "food_truck_stand", "bar",
             "health_food_restaurant", "vegan_restaurant", "hong_kong_style_cafe", "bagel_shop"}

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
ITEM = re.compile(r'"(?:name|title|label|item_name|altText|headerImageAlt|imageAlt|alt)"\s*:\s*"[^"]*' + M_WORD, re.I)
ITEM_NAME = re.compile(r'"(?:name|title|label|item_name|altText|headerImageAlt|imageAlt|alt)"\s*:\s*"([^"]*' + M_WORD + r'[^"]*)"', re.I)
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

def merge(old, new):
    if old is None: return new
    if old.get("status") == "ok" and new.get("status") != "ok": return old
    if new.get("status") == "ok" and old.get("status") != "ok": return new
    if new.get("status") != "ok": return new
    hits = list(old.get("hits", []))
    urls = {h["url"] for h in hits}
    for h in new.get("hits", []):
        if h["url"] not in urls: hits.append(h)
    return {**old, "hits": hits, "matcha": bool(hits), "pages": old.get("pages", 0) + new.get("pages", 0),
            "platform": old.get("platform") or new.get("platform"), "pdf": old.get("pdf") or new.get("pdf"), "at": max(old["at"], new["at"])}

res = {}
for cf in CRAWL_FILES:
    if not os.path.exists(cf): continue
    for line in open(cf, encoding="utf8"):
        line = line.strip()
        if not line: continue
        try: r = json.loads(line)
        except Exception: continue
        res[r["host"]] = merge(res.get(r["host"]), r)
crawled = len(res)
SKIP_HIT = re.compile(r"[/_-](cart|account|login|gift|careers|jobs|privacy|terms|policies|catering|blog|press|news|wholesale|franchise|investors?)", re.I)
for _h, _r in res.items():
    if _r.get("hits"):
        _r["hits"] = [x for x in _r["hits"] if not SKIP_HIT.search(x["url"])]
        _r["matcha"] = bool(_r["hits"])

seen_ids, rows = set(), []
for pq in PLACES:
    if not os.path.exists(pq): continue
    cols = [c[0] for c in con.execute(f"DESCRIBE SELECT * FROM '{pq}'").fetchall()]
    cc_expr = "cc" if "cc" in cols else "'US'"
    nm_expr = "name_match" if "name_match" in cols else "false"
    for r in con.execute(f"""SELECT id, name, cat, {cc_expr} AS cc, address, city, state, zip, lat, lng, website, phone, confidence, brand_wikidata, {nm_expr} AS nm
                             FROM '{pq}' WHERE name IS NOT NULL""").fetchall():
        if r[0] in seen_ids: continue
        seen_ids.add(r[0]); rows.append(r)
brand_count = Counter(r[13] for r in rows if r[13])
host_rows = Counter(host_of(r[10]) for r in rows if r[10])

AGG_HOST = re.compile(r"(yelp|facebook|instagram|tripadvisor|doordash|ubereats|grubhub|google|toasttab|clover|square\.site|linktr\.ee|tiktok|twitter|x\.com|youtube|opentable|postmates|seamless|menupix|allmenus|foursquare|zomato|tabelog|hotpepper|gnavi|retty|naver|kakao|placeweb|placestars)", re.I)
for (id_, name, cat, cc, address, city, state, zip_, lat, lng, website, phone, conf, wd, nm) in rows:
    if cat == "internet_cafe": continue
    if cc == "US" and not state: continue
    if region_of(cc) is None: continue
    if conf is not None and conf < 0.3: continue
    name = clean(name)
    if not name: continue
    if wd and brand_count[wd] >= 15: continue                       # big chains are handled separately
    h = host_of(website) if website else None
    if h and host_rows[h] >= 25: continue                           # one site shared by 25+ places = a chain
    r = res.get(h) if h else None
    ev = evidence(r) if r and r.get("status") == "ok" and r.get("matcha") else []
    via = None
    if not ev:
        # matcha in the business's own name is enough
        if nm and NAME_FOCUS.search(name) and cat in NAME_CATS and not (r and r.get("status") == "robots"): via = "name"
        else: continue
    focus = bool(NAME_FOCUS.search(name)) or any(e["st"] >= 2 and e["n"] >= 12 for e in ev)
    us = cc == "US"
    cafes.append({
        "id": id_.replace("-", "")[:10], "name": name, "cat": cat, "cc": cc,
        "address": clean(address), "city": clean(city), "state": clean(state) if us else "", "zip": clean(zip_)[:5] if us else clean(zip_)[:12],
        "lat": round(lat, 5), "lng": round(lng, 5),
        "url": (None if (via and h and AGG_HOST.search(h)) else (website.split("?")[0] if website else None)), "phone": clean(phone) or None,
        "focus": focus, "ev": [{**e, "s": e["s"][: (3 if i == 0 else 1)]} for i, e in enumerate(ev[:2])],
        "menu": next((e["u"] for e in ev if e["k"] == "menu"), None),
        "platform": (r or {}).get("platform"), "pdf": (r or {}).get("pdf"), "checked": (r or {}).get("at") or "2026-11-06", "conf": round(conf or 0, 2), "shared": 0,
        **({"via": via} if via else {}),
    })
    stats["name" if via else "site"] += 1

if os.path.exists(LEADS_FILE):
    leads = json.load(open(LEADS_FILE, encoding="utf-8"))
    cafes.extend(leads)
    stats["leads"] = len(leads)

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
for c in cafes: by_host.setdefault(host_of(c["url"]) if c["url"] else c["id"], []).append(c)
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

print(stats); print(f"hosts crawled {crawled}; cafés with matcha on their own site: {len(cafes)} (matcha-focused {sum(c['focus'] for c in cafes)})")
print("by region", {k: len(v) for k, v in slims.items()})
print("by country", Counter(c["cc"] for c in cafes).most_common(14))
print("evidence strength", Counter(max((e["st"] for e in c["ev"]), default=0) for c in cafes))
print("files", len(files), "full KB", sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR)) // 1024,
      "slim KB", {k: os.path.getsize(os.path.join(SLIM_DIR, f"cafes-slim-{k}.json")) // 1024 for k in ("us", "ca", "eu", "jp", "kr")})
