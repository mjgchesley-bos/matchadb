"""Turn lead websites (domains with 'matcha' in the hostname) into café records:
only real storefronts (own site shows a street address + hours/menu), in supported countries, whose own site says 'matcha' as a word.
Coordinates: the site's own schema.org geo if present, otherwise OpenStreetMap Nominatim (1 request/second, cached; ODbL).
"""
import json, re, sys, os, time, hashlib, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding="utf-8")
ENR = "C:/temp/cafes/leads_enriched.jsonl"
CRAWL = "C:/temp/cafes/v2_leads.jsonl"
CACHE = "C:/temp/cafes/geocache.json"
OUT = "C:/temp/cafes/leads_venues.json"
SUPPORTED = {"US", "CA", "JP", "KR", "GB", "IE", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "LU", "AT", "CH", "SE", "NO", "DK", "FI", "IS", "PL", "CZ", "SK", "HU", "GR", "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY"}
COUNTRY_NAMES = {"united states": "US", "usa": "US", "canada": "CA", "japan": "JP", "south korea": "KR", "korea": "KR", "united kingdom": "GB", "uk": "GB", "france": "FR", "germany": "DE", "italy": "IT", "spain": "ES", "netherlands": "NL", "belgium": "BE", "switzerland": "CH", "austria": "AT", "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI", "poland": "PL", "ireland": "IE", "portugal": "PT", "luxembourg": "LU", "czechia": "CZ", "czech republic": "CZ"}
TLD_CC = {"fr": "FR", "de": "DE", "jp": "JP", "kr": "KR", "uk": "GB", "ca": "CA", "it": "IT", "es": "ES", "nl": "NL", "be": "BE", "ch": "CH", "at": "AT", "se": "SE", "no": "NO", "dk": "DK", "fi": "FI", "pl": "PL", "ie": "IE", "pt": "PT", "lu": "LU", "cz": "CZ"}
US_ST = set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split())
CA_PROV = set("AB BC MB NB NL NS NT NU ON PE QC SK YT".split())
GOOD_TYPE = re.compile(r"Cafe|Coffee|Restaurant|FoodEstablishment|Bakery|IceCream|LocalBusiness|Store|TeaRoom|Dessert|BarOrPub|Place", re.I)
BAD_TYPE = re.compile(r"OnlineStore|Sports|Auto|Apartment|Yoga|Professional|Brand|Hotel|Lodging|School|Medical|Dentist|Church", re.I)
M_WORD = re.compile(r"\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차", re.I)

def cc_of(country, region, domain):
    if country:
        c = str(country).strip()
        if len(c) == 2 and c.upper() in SUPPORTED: return c.upper()
        if c.lower() in COUNTRY_NAMES: return COUNTRY_NAMES[c.lower()]
        if len(c) == 2: return c.upper()          # supported check happens later
    if region and str(region).upper() in US_ST: return "US"
    if region and str(region).upper() in CA_PROV: return "CA"
    tld = domain.rsplit(".", 1)[-1]
    return TLD_CC.get(tld)

cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
def geocode(q, cc):
    if q in cache: return cache[q]
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "json", "limit": 1, "countrycodes": cc.lower()})
    req = urllib.request.Request(url, headers={"User-Agent": "MatchaDBBot/1.0 (+https://www.matchadb.com; matcha cafe finder)"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=30))
        v = [float(r[0]["lat"]), float(r[0]["lon"])] if r else None
    except Exception as e:
        print("geocode error", q[:50], str(e)[:60]); v = None
    cache[q] = v; json.dump(cache, open(CACHE, "w", encoding="utf-8")); time.sleep(1.1)
    return v

crawl = {}
for l in open(CRAWL, encoding="utf-8"):
    try: r = json.loads(l)
    except Exception: continue
    crawl[r["host"]] = r
sys.path.insert(0, "C:/temp/cafes")
out, skipped = [], {}
for l in open(ENR, encoding="utf-8"):
    try: e = json.loads(l)
    except Exception: continue
    if e.get("status") != "ok": continue
    dom = e["host"]
    ld = [x for x in e["ld"] if not BAD_TYPE.search(x["types"] or "") and (not x["types"] or GOOD_TYPE.search(x["types"]) or x["types"] == "")]
    cand = None
    if ld: cand = ld[0]
    elif e.get("textAddr") and (e.get("hasHours") or e.get("hasMenuPage")): cand = {"types": "", "name": None, "street": e["textAddr"]["street"], "locality": e["textAddr"]["locality"], "region": e["textAddr"]["region"], "postal": e["textAddr"]["postal"], "country": "US", "lat": None, "lng": None}
    if not cand or not cand.get("street"):
        skipped["no storefront address"] = skipped.get("no storefront address", 0) + 1; continue
    if not (e.get("hasHours") or e.get("hasMenuPage") or re.search("Cafe|Coffee|Restaurant|Food|Bakery|IceCream", cand["types"] or "")):
        skipped["no hours/menu"] = skipped.get("no hours/menu", 0) + 1; continue
    name = cand.get("name") or e.get("site") or (e.get("title") or "").split("|")[0].split(" - ")[0].strip()
    name = re.sub(r"^[^\w]+|[^\w.!)]+$", "", re.sub(r"\s+", " ", name or "").strip())
    if not M_WORD.search(" ".join(filter(None, [name, e.get("site"), e.get("title")]))):
        skipped["matcha not a word in its name/title"] = skipped.get("matcha not a word in its name/title", 0) + 1; continue
    cc = cc_of(cand.get("country"), cand.get("region"), dom)
    if cc not in SUPPORTED:
        skipped["country not covered"] = skipped.get("country not covered", 0) + 1; continue
    lat = lng = None
    try:
        if cand.get("lat") not in (None, "") and cand.get("lng") not in (None, ""): lat, lng = float(cand["lat"]), float(cand["lng"])
    except Exception: pass
    if lat is None:
        q = ", ".join(x for x in [cand["street"], cand.get("locality"), (cand.get("region") if cc in ("US", "CA") else None), cand.get("postal")] if x)
        g = geocode(q, cc)
        if not g and cand.get("locality"): g = geocode(f"{cand['street']}, {cand['locality']}", cc)
        if not g: skipped["could not place on map"] = skipped.get("could not place on map", 0) + 1; continue
        lat, lng = g
    r = crawl.get(dom)
    ev = []
    if r and r.get("status") == "ok" and r.get("matcha"):
        ev = [{"u": h["url"], "k": h["kind"], "st": 3 if h["visible"] and h["kind"] == "menu" else 2, "n": h["count"], "s": [re.sub(r"\s+", " ", s) for s in h["snippets"][:2]]} for h in r["hits"] if h["visible"]][:2]
    us = cc == "US"
    rec = {
        "id": hashlib.sha1(f"lead:{dom}:{cand['street']}".encode()).hexdigest()[:10], "name": name[:80], "cat": "cafe", "cc": cc,
        "address": cand["street"][:100], "city": (cand.get("locality") or "")[:60], "state": (cand.get("region") or "")[:2].upper() if us else "",
        "zip": (cand.get("postal") or "")[:5] if us else (cand.get("postal") or "")[:12], "lat": round(lat, 5), "lng": round(lng, 5),
        "url": e["url"], "phone": cand.get("tel"), "focus": True, "ev": ev, "menu": next((x["u"] for x in ev if x["k"] == "menu"), None),
        "platform": (r or {}).get("platform"), "pdf": (r or {}).get("pdf"), "checked": e["at"], "conf": 0.5, "shared": 1,
    }
    if not ev: rec["via"] = "name"
    if us and rec["state"] not in US_ST: skipped["bad US state"] = skipped.get("bad US state", 0) + 1; continue
    out.append(rec)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print(len(out), "lead venues;", skipped)
for r in out[:40]: print(r["cc"], r["name"], "|", r["city"], r["state"], "|", r["url"], "|", "ev" if r["ev"] else "name-only")
