"""Step 1 of the automatic review of "Suggest a café" submissions (everything that needs no web search).

For each new suggestion:
  - sanity checks (spam, chains), geocode the address, look for the same place in our datasets within ~350 m,
  - find the café's OWN website (the place record, or the submitter's link if it is not a social/review page),
  - read that site like a visitor (headless browser, robots honoured) and look for matcha.
Outcome per suggestion:
  list_own_site   its own site shows matcha          -> listed straight away (normal "matcha on their site" listing)
  needs_channels  no site / unreadable / no proof    -> Claude searches Reddit, Yelp, Instagram, guides for independent mentions,
                                                       then review_decide.py applies the rules
  reject          chain, spam, or address not found
usage: python -I review_prepare.py   ->  C:/temp/cafes/suggest/dossier.json
"""
import asyncio, collections, datetime, hashlib, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
import duckdb

sys.path.insert(0, "C:/temp/cafes/guides")
sys.path.insert(0, "C:/temp/cafes/progress")
import verify_leads as V                      # probe(): renders a site + its menu/ordering pages and finds matcha
from playwright.async_api import async_playwright
from progress import Task

sys.stdout.reconfigure(encoding="utf-8")
ENV = "C:/Users/mjgch/projects/matchadb/.env.local"
URL = "https://gropvtwigbddfikcujhz.supabase.co"
WORK = "C:/temp/cafes"
OUT_DIR = f"{WORK}/suggest"
os.makedirs(OUT_DIR, exist_ok=True)
NOT_OWN = re.compile(r"(instagram|facebook|tiktok|twitter|x\.com|youtube|yelp|tripadvisor|google\.|goo\.gl|maps\.|reddit|linktr\.ee|linktree|doordash|ubereats|grubhub|toasttab|squareup|square\.site|clover\.com|chownow|wixsite|godaddysites|business\.site|foursquare|opentable|resy\.com|beacons\.ai|substack)", re.I)


def secret():
    for l in open(ENV, encoding="utf-8"):
        if l.startswith("SUPABASE_SECRET_KEY="):
            return l.split("=", 1)[1].strip().strip("\"'")
    sys.exit("SUPABASE_SECRET_KEY missing in .env.local")


def sb(method, path, body=None):
    k = secret()
    r = urllib.request.Request(f"{URL}/rest/v1/{path}", method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"apikey": k, "Authorization": "Bearer " + k, "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(r, timeout=30) as resp:
        return resp.read().decode()


def norm(s):
    return V.norm(s)


def same(a, b):
    import difflib
    if not a or not b:
        return False
    return a == b or (len(a) >= 5 and len(b) >= 5 and (a in b or b in a)) or difflib.SequenceMatcher(None, a, b).ratio() >= 0.88


def geocode(q):
    time.sleep(1.1)
    try:
        u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=" + urllib.parse.quote(q)
        arr = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "MatchaDBBot/1.0 (+https://www.matchadb.com)"}), timeout=15).read())
    except Exception:
        return None
    if not arr:
        return None
    a = arr[0]
    ad = a.get("address", {})
    st = (ad.get("ISO3166-2-lvl4") or "")
    cc = (ad.get("country_code") or "").upper()
    return {"lat": round(float(a["lat"]), 5), "lng": round(float(a["lon"]), 5), "address": (ad.get("house_number", "") + " " + ad.get("road", "")).strip(),
            "city": ad.get("city") or ad.get("town") or ad.get("village") or ad.get("suburb") or "", "state": st.split("-")[-1] if cc == "US" and "-" in st else "",
            "zip": ad.get("postcode", ""), "cc": cc}


def nearby_places(lat, lng):
    con = duckdb.connect()
    out = []
    for pq in ("us_cafes", "ext_cands", "fsq_all_cands"):
        p = f"{WORK}/{pq}.parquet"
        try:
            for r in con.execute(f"select name, website, lat, lng from '{p}' where lat between {lat-0.0035} and {lat+0.0035} and lng between {lng-0.0045} and {lng+0.0045}").fetchall():
                out.append({"name": r[0], "website": r[1], "lat": r[2], "lng": r[3]})
        except Exception:
            pass
    return out


def outlets(name):
    try:
        return duckdb.connect().execute(f"select count(*) from '{WORK}/us_cafes.parquet' where lower(name) = ?", [name.lower()]).fetchone()[0]
    except Exception:
        return 0


def listed_already(lat, lng, name):
    """Is it already on the map? Check the repo's data files for a similar name within 300 m."""
    import glob, math
    n = norm(name)
    for f in glob.glob("C:/Users/mjgch/projects/matchadb/data/cafes/*.json"):
        try:
            for c in json.load(open(f, encoding="utf-8")):
                if c.get("lat") is None or abs(c["lat"] - lat) > 0.004 or abs(c["lng"] - lng) > 0.005:
                    continue
                if same(n, norm(c["name"])):
                    return c["name"]
        except Exception:
            pass
    return None


async def main():
    k = secret()
    rows = json.loads(urllib.request.urlopen(urllib.request.Request(f"{URL}/rest/v1/cafe_suggestions?status=eq.new&order=created_at.asc&select=*",
                                                                  headers={"apikey": k, "Authorization": "Bearer " + k}), timeout=30).read())
    print(len(rows), "new suggestion(s)", flush=True)
    dossier = []
    if not rows:
        json.dump(dossier, open(f"{OUT_DIR}/dossier.json", "w", encoding="utf-8"), indent=1)
        return
    task = Task("suggest-review", "Reviewing café suggestions", total=len(rows), unit="suggestions", detail="starting")
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(user_agent=V.UA, viewport={"width": 1280, "height": 900})
        for i, s in enumerate(rows):
            d = {"id": s["id"], "name": re.sub(r"\s+", " ", s["name"]).strip(), "address": re.sub(r"\s+", " ", s["address"]).strip(), "link": (s.get("link") or "").strip(), "note": s.get("note") or "",
                 "outcome": None, "reason": "", "geo": None, "place_matches": [], "site": None, "site_state": None, "ev": [], "queries": []}
            dossier.append(d)
            task.update(done=i, detail=f"{d['name']}: locating", force=True)
            if re.search(r"https?://|www\.|\.com\b", d["name"], re.I) or len(re.findall(r"[A-Za-zÀ-￿]", d["name"])) < 2:
                d.update(outcome="reject", reason="name looks like spam or a link"); continue
            geo = geocode(f"{d['name']}, {d['address']}") or geocode(d["address"])
            if not geo:
                d.update(outcome="reject", reason="address could not be located"); continue
            d["geo"] = geo
            done = listed_already(geo["lat"], geo["lng"], d["name"])
            if done:
                d.update(outcome="reject", reason=f"already on the map as {done}"); continue
            n = norm(d["name"])
            near = [x for x in nearby_places(geo["lat"], geo["lng"]) if same(n, norm(x["name"]))]
            d["place_matches"] = near[:3]
            if outlets(d["name"]) >= 25:
                d.update(outcome="reject", reason="chain (many outlets)"); continue
            site = None
            for x in near:
                if x["website"] and not NOT_OWN.search(x["website"]):
                    site = x["website"] if x["website"].startswith("http") else "https://" + x["website"]; break
            if not site and d["link"] and not NOT_OWN.search(d["link"]):
                site = d["link"] if d["link"].startswith("http") else "https://" + d["link"]
            d["site"] = site
            if d["link"] and NOT_OWN.search(d["link"]):
                d["submitter_link"] = d["link"]
            if site:
                task.update(detail=f"{d['name']}: reading its website", force=True)
                pr = await V.probe(ctx, site)
                d["site_state"] = pr["state"]
                if pr["matcha"]:
                    txt = pr["text"].lower()
                    city_ok = (geo["city"] and geo["city"].lower() in txt) or (geo["zip"] and str(geo["zip"])[:5] in txt) or bool(near)
                    if city_ok:
                        d.update(outcome="list_own_site", ev=pr["matcha"], platform=pr.get("platform"), reason="own site shows matcha"); continue
                    d["reason"] = "site shows matcha but not shown to be this location"
                elif pr["state"] == "ok":
                    d["reason"] = "own site was read and shows no matcha"
            loc = f"{geo['city']} {geo['state']}".strip()
            d["queries"] = [f'site:reddit.com "{d["name"]}" {loc} matcha', f'"{d["name"]}" {loc} yelp matcha', f'site:instagram.com "{d["name"]}" {loc}', f'"{d["name"]}" {loc} matcha']
            d["outcome"] = "needs_channels"
            d["own_site_no_matcha"] = d["reason"] == "own site was read and shows no matcha"
        await b.close()
    task.update(done=len(rows), detail=f"{sum(1 for x in dossier if x['outcome'] == 'needs_channels')} need web-search checks", force=True)
    json.dump(dossier, open(f"{OUT_DIR}/dossier.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for d in dossier:
        print(f"- {d['name']} | {d['address'][:40]} | {d['outcome']} | {d['reason']}")
    task.finish(f"{len(dossier)} reviewed: " + ", ".join(f"{v} {k}" for k, v in collections.Counter(x["outcome"] for x in dossier).items()))


if __name__ == "__main__":
    asyncio.run(main())
