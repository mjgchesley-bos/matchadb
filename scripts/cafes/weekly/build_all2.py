import unicodedata
"""Build the café data for the site from Overture places + the menu crawls.

A café is included only when its OWN website (homepage or a menu / drinks / order page) mentions matcha
(Latin script, or 抹茶 / まっちゃ / マッチャ / 말차). Output:
  <out_dir>/{ST}.json      US states (2 letters), one file per state
  <out_dir>/{CCC}.json     every other country (ISO alpha-3), one file per country
  <slim_dir>/cafes-slim-{region}.json   the map list per region: us, ca, eu, jp, kr, au

usage: python -I build_all.py OUT_DIR SLIM_DIR
"""
import duckdb, json, re, sys, os, shutil, html, collections
from urllib.parse import urlparse
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
OUT_DIR = sys.argv[1]
SLIM_DIR = sys.argv[2]
CRAWL_FILES = [f"C:/temp/cafes/{n}" for n in ("crawl.jsonl", "crawl_intl.jsonl", "crawl_intl_retry.jsonl", "v2_a.jsonl", "v2_a2.jsonl", "v2_b.jsonl", "v2_c.jsonl", "v2_r1.jsonl", "v2_r2.jsonl", "v2_r3.jsonl", "v2_r4.jsonl", "v2_merit.jsonl", "v2_leads.jsonl", "v2_manual.jsonl")]
import glob as _glob
for _f in sorted(_glob.glob("C:/temp/cafes/v2_*.jsonl") + _glob.glob("C:/temp/cafes/w_*.jsonl"), key=os.path.getmtime):
    if _f.replace("\\", "/") not in [x.replace("\\", "/") for x in CRAWL_FILES]: CRAWL_FILES.append(_f.replace("\\", "/"))
PLACES = ["C:/temp/cafes/us_cafes.parquet", "C:/temp/cafes/intl_cafes.parquet", "C:/temp/cafes/ext_cands.parquet", "C:/temp/cafes/fsq_cands.parquet", "C:/temp/cafes/fsq_all_cands.parquet",
          "C:/temp/cafes/au_cafes.parquet", "C:/temp/cafes/au_ext.parquet", "C:/temp/cafes/fsq_au_cafes.parquet"]
LEADS_FILE = "C:/temp/cafes/leads_venues.json"      # venues found through web leads (not in Overture): already in café shape
# categories where "matcha" in the business name is enough to list it (the name is its own claim)
NAME_CATS = {None, "cafe", "coffee_shop", "tea_room", "bubble_tea_shop", "coffee_roastery", "dessert_shop", "ice_cream_shop", "gelato_shop", "smoothie_juice_bar",
             "juice_bar", "bakery", "donut_shop", "creperie", "breakfast_and_brunch_restaurant", "restaurant", "japanese_restaurant", "food_truck_stand", "bar",
             "health_food_restaurant", "vegan_restaurant", "hong_kong_style_cafe", "bagel_shop"}

CC3 = {"CA": "CAN", "JP": "JPN", "KR": "KOR", "AU": "AUS", "GB": "GBR", "IE": "IRL", "FR": "FRA", "DE": "DEU", "IT": "ITA", "ES": "ESP", "PT": "PRT", "NL": "NLD", "BE": "BEL",
       "LU": "LUX", "AT": "AUT", "CH": "CHE", "SE": "SWE", "NO": "NOR", "DK": "DNK", "FI": "FIN", "IS": "ISL", "PL": "POL", "CZ": "CZE", "SK": "SVK", "HU": "HUN",
       "GR": "GRC", "RO": "ROU", "BG": "BGR", "HR": "HRV", "SI": "SVN", "EE": "EST", "LV": "LVA", "LT": "LTU", "MT": "MLT", "CY": "CYP"}
EU = {"GB", "IE", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "LU", "AT", "CH", "SE", "NO", "DK", "FI", "IS", "PL", "CZ", "SK", "HU", "GR", "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY"}

def region_of(cc):
    if cc == "US": return "us"
    if cc == "CA": return "ca"
    if cc == "JP": return "jp"
    if cc == "KR": return "kr"
    if cc == "AU": return "au"
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
CJK_ADDR = re.compile(r"[぀-ヿ㐀-鿿가-힯]")
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

def merge_weekly(old, new):
    """Results from the weekly refresh. A failed fetch never removes anything. A fresh read that finds matcha replaces the old hits
    (menus change). A fresh read that finds none removes the listing only after TWO weekly reads in a row find none."""
    if old is None: return new
    if new.get("status") != "ok" or old.get("via") == "manual": return old     # hand-verified evidence is never overwritten by a crawl
    if new.get("matcha"): return {**new, "miss": 0, "platform": new.get("platform") or old.get("platform"), "pdf": new.get("pdf") or old.get("pdf")}
    if old.get("status") == "ok" and old.get("matcha"):
        miss = old.get("miss", 0) + 1
        return {**old, "miss": miss} if miss < 2 else {**new, "miss": miss}
    return new

res = {}
for cf in CRAWL_FILES:
    if not os.path.exists(cf): continue
    for line in open(cf, encoding="utf8"):
        line = line.strip()
        if not line: continue
        try: r = json.loads(line)
        except Exception: continue
        res[r["host"]] = (merge_weekly if os.path.basename(cf).startswith("w_") else merge)(res.get(r["host"]), r)
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
# how many distinct outlets use a website (the same café listed by two sources counts once): 25+ = a chain
host_rows = Counter(h for h, _, _ in {(host_of(r[10]), round(r[8], 3), round(r[9], 3)) for r in rows if r[10] and r[8] is not None and r[9] is not None})

# a brand with a different website in every country (starbucks.be, starbucks.ie ...) never reaches 25 outlets on one site, so also count by NAME:
# the same name at 25+ distinct outlets that share only a handful of websites is a chain (independents that share a name each have their own site).
def _chain_key(name, city):
    n = re.sub(r"[\W_]+", "", unicodedata.normalize("NFKD", (name or "").lower()).encode("ascii", "ignore").decode())
    c = re.sub(r"[\W_]+", "", unicodedata.normalize("NFKD", (city or "").lower()).encode("ascii", "ignore").decode())
    if c and n.endswith(c) and len(n) - len(c) >= 4: n = n[: -len(c)]
    for g in ("coffee", "cafe", "caf"):
        if n.endswith(g) and len(n) - len(g) >= 4: n = n[: -len(g)]
    return n
_outlets, _hosts, _site_outlets = collections.defaultdict(set), collections.defaultdict(set), collections.defaultdict(set)
for r in rows:
    if r[8] is None or r[9] is None: continue
    k = _chain_key(r[1], r[5])
    if len(k) < 4: continue
    _outlets[k].add((round(r[8], 3), round(r[9], 3)))
    if r[10]: _hosts[k].add(host_of(r[10])); _site_outlets[k].add((round(r[8], 3), round(r[9], 3)))
NAME_CHAINS = {k for k, o in _outlets.items() if len(o) >= 25 and len(_site_outlets[k]) >= 15 and len(_hosts[k]) <= max(3, 0.15 * len(_site_outlets[k]))}
CHAIN_HOSTS = {host_of(r[10]) for r in rows if r[10] and r[8] is not None and _chain_key(r[1], r[5]) in NAME_CHAINS}      # every website those chains use
print("name-based chains:", len(NAME_CHAINS), sorted(NAME_CHAINS)[:60])

AGG_HOST = re.compile(r"(yelp|facebook|instagram|tripadvisor|doordash|ubereats|grubhub|google|toasttab|clover|square\.site|linktr\.ee|tiktok|twitter|x\.com|youtube|opentable|postmates|seamless|menupix|allmenus|foursquare|zomato|tabelog|hotpepper|gnavi|retty|naver|kakao|placeweb|placestars)", re.I)
for (id_, name, cat, cc, address, city, state, zip_, lat, lng, website, phone, conf, wd, nm) in rows:
    if cat == "internet_cafe": continue
    if lat is None or lng is None: continue
    if cc == "US" and not state: continue
    if region_of(cc) is None: continue
    if conf is not None and conf < 0.3: continue
    name = clean(name)
    if not name: continue
    # a street address written in Japanese / Korean / Chinese script outside Japan and Korea = the place data put the wrong country on it
    if cc not in ("JP", "KR") and (CJK_ADDR.search(clean(address)) or (cc == "AU" and CJK_ADDR.search(clean(city) + clean(state)))):
        stats["wrong_country"] += 1; continue
    if wd and brand_count[wd] >= 15: continue                       # big chains are handled separately
    h = host_of(website) if website else None
    if h and host_rows[h] >= 25: continue                           # one site shared by 25+ places = a chain
    if h and (h in CHAIN_HOSTS or _chain_key(name, city) in NAME_CHAINS): stats['name_chain'] += 1; continue   # same name at 25+ outlets with few websites = a chain
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

# a website shared by several places can be a wrong link in the place data (e.g. a London café listing Merit Coffee's site).
# When one site clearly belongs to a group of places that carry its name, drop the ones that do not: other country, or a different name.
GENERIC = {"coffee", "cafe", "caf", "co", "tea", "roasters", "roastery", "roasting", "the", "and", "company", "bar", "shop", "house", "kitchen", "bakery", "local"}
def _label(h): return re.sub(r"[^a-z0-9]", "", h.lower().replace("www.", "").rsplit(".", 1)[0]) if h else ""
def _core_label(lbl):
    for g in sorted(GENERIC, key=len, reverse=True):
        if len(lbl) - len(g) >= 4: lbl = lbl.replace(g, "")
    return lbl
def _matches(c, lbl):
    core = _core_label(lbl)
    nm = norm_name(c["name"])
    return bool(core) and (core in nm or any(len(t) >= 4 and t in lbl for t in re.findall(r"[a-z0-9]+", c["name"].lower()) if t not in GENERIC))
def norm_name(s): return re.sub(r"[\W_]+", "", unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode())
_hg = {}
for c in cafes:
    if c.get("via") or not c["url"]: continue
    hh = host_of(c["url"])
    if hh and not AGG_HOST.search(hh): _hg.setdefault(hh, []).append(c)
_drop = set()
for hh, cs in _hg.items():
    if len(cs) < 3: continue
    lbl = _label(hh)
    modal = Counter(c["cc"] for c in cs).most_common(1)[0][0]
    core = [c for c in cs if _matches(c, lbl)]
    for c in cs:
        if c in core or len(core) < 3: continue
        latin = all(ord(ch) < 0x250 for ch in c["name"])
        on_core = any(abs(o["lat"] - c["lat"]) < 0.00008 and abs(o["lng"] - c["lng"]) < 0.00008 for o in core)
        if (latin and c["cc"] != modal) or on_core: _drop.add(c["id"])
if _drop:
    print("dropped by shared-site check:", len(_drop))
    cafes = [c for c in cafes if c["id"] not in _drop]

# near-duplicates: same name within ~150 m
def norm(s): return re.sub(r'[\W_]+', '', s.lower())
cafes.sort(key=lambda c: -c["conf"])
kept, seen = [], {}
for c in cafes:
    key = norm(c["name"]) or c["id"]
    def _near(o):
        wide = c.get("via") or o.get("via")          # a name-only listing (e.g. Foursquare) can be ~1 km off the same café's other record
        return abs(o["lat"] - c["lat"]) < (0.012 if wide else 0.0015) and abs(o["lng"] - c["lng"]) < (0.016 if wide else 0.002)
    if any(_near(o) for o in seen.get(key, [])): continue
    seen.setdefault(key, []).append(c)
    kept.append(c)
cafes = kept
import difflib
_CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")
def _nn(x): return re.sub(r"[\W_]+", "", unicodedata.normalize("NFKD", x.lower()).encode("ascii", "ignore").decode()) or re.sub(r"[\W_]+", "", x.lower())
def _same_place(a, b):
    """Two records on the same website at the same spot are one café when their names agree: one contains the other, are close in spelling,
    or are the same name written in different scripts (Japanese vs romaji). Two different venues that share a building and a site stay separate."""
    na, nb = _nn(a), _nn(b)
    if not na or not nb: return True
    if na in nb or nb in na: return True
    if bool(_CJK.search(a)) != bool(_CJK.search(b)): return True
    return difflib.SequenceMatcher(None, na, nb).ratio() >= 0.6

_hseen, _kept2, _hdrop = {}, [], []
for c in cafes:
    hh = host_of(c["url"]) if c.get("url") else None
    if hh and not AGG_HOST.search(hh) and not c.get("via"):
        _m = next((o for o in _hseen.get(hh, []) if abs(o["lat"] - c["lat"]) < 0.001 and abs(o["lng"] - c["lng"]) < 0.0013 and _same_place(o["name"], c["name"])), None)
        if _m is not None:
            _hdrop.append((c["cc"], c["name"], _m["name"], hh)); continue
        _hseen.setdefault(hh, []).append(c)
    _kept2.append(c)
cafes = _kept2
print('same-site-same-spot duplicates dropped:', len(_hdrop))
import random as _r; _r.seed(5)
for _x in _r.sample(_hdrop, min(25, len(_hdrop))): print('   DUP', _x)

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
    slims.setdefault(region_of(c["cc"]), []).append([c["id"], c["name"], c["address"], c["city"], c["state"], c["zip"], c["lat"], c["lng"], 2 if c.get("via") == "name" else (1 if c["focus"] else 0), c["cc"]])
for reg in ("us", "ca", "eu", "jp", "kr", "au"):
    json.dump(slims.get(reg, []), open(os.path.join(SLIM_DIR, f"cafes-slim-{reg}.json"), "w", encoding="utf8"), separators=(",", ":"), ensure_ascii=False)

print(stats); print(f"hosts crawled {crawled}; cafés with matcha on their own site: {len(cafes)} (matcha-focused {sum(c['focus'] for c in cafes)})")
print("by region", {k: len(v) for k, v in slims.items()})
print("by country", Counter(c["cc"] for c in cafes).most_common(14))
print("evidence strength", Counter(max((e["st"] for e in c["ev"]), default=0) for c in cafes))
print("files", len(files), "full KB", sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR)) // 1024,
      "slim KB", {k: os.path.getsize(os.path.join(SLIM_DIR, f"cafes-slim-{k}.json")) // 1024 for k in ("us", "ca", "eu", "jp", "kr", "au")})
