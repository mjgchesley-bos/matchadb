"""Step 2 of the automatic suggestion review: apply the rules, add to the venue list, record the outcome.

Suggestions come only from signed-in members, so the member's word that a café serves matcha is trusted. The review
only has to confirm that the PLACE is real and where it is. THE RULES (code-enforced):
  1. Its own site shows matcha                       -> listed normally ("Matcha on their site").
  2. Otherwise it is listed as "Reported by locals" when ALL of:
       - it can be placed at a street address (the address geocodes to a street, or it matches a known place within 350 m);
       - it is not a chain, not already listed, not spam, and not reported closed.
     No second source is needed. (Its own site not mentioning matcha does not block it: menus on websites go stale.)
  3. Anything else is rejected with a reason. The submitter's email is never published.
Optional: C:/temp/cafes/suggest/findings.json can hold, per suggestion id, { "address": "<street address found by a web search>",
  "closed": false, "sources": [ {"url", "channel", "names_place", "says_matcha"} ] }. It is used only to find a street address for a
  vague submission, to flag a closed place, and to attach extra links. Only a link and its host are ever published, never source text.
usage: python -I review_decide.py [--dry]   ->  updates leads_venues.json (+ copies), cafe_suggestions.status, suggest/review_log.jsonl
"""
import collections, datetime, hashlib, json, math, os, re, shutil, sys, unicodedata, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
SUG = "C:/temp/cafes/suggest"
VENUES = ["C:/temp/cafes/leads_venues.json", "C:/temp/weekly/leads_venues.json", "C:/Users/mjgch/projects/matchadb/scripts/cafes/weekly/leads_venues.json"]
ENV = "C:/Users/mjgch/projects/matchadb/.env.local"
URL = "https://gropvtwigbddfikcujhz.supabase.co"
DRY = "--dry" in sys.argv
TODAY = datetime.date.today().isoformat()
ALLOWED_CHANNELS = {"reddit", "yelp", "instagram", "guide", "news", "other"}


def host(u):
    h = urllib.parse.urlparse(u if "//" in u else "//" + u).netloc.lower().replace("www.", "")
    return ".".join(h.split(".")[-2:]) if h else ""      # registrable-ish domain, so m.yelp.com == yelp.com


def secret():
    for l in open(ENV, encoding="utf-8"):
        if l.startswith("SUPABASE_SECRET_KEY="):
            return l.split("=", 1)[1].strip().strip("\"'")


WAIT = "waiting for an address lookup"


def set_status(sid, status, note):
    if DRY:
        return
    k = secret()
    r = urllib.request.Request(f"{URL}/rest/v1/cafe_suggestions?id=eq.{sid}", method="PATCH", data=json.dumps({"status": status, "reviewer_note": note[:300]}).encode(),
                               headers={"apikey": k, "Authorization": "Bearer " + k, "Content-Type": "application/json", "Prefer": "return=minimal"})
    urllib.request.urlopen(r, timeout=30).read()


def geocode(q):
    import time
    time.sleep(1.1)
    try:
        u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=" + urllib.parse.quote(q)
        arr = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "MatchaDBBot/1.0 (+https://www.matchadb.com)"}), timeout=15).read())
    except Exception:
        return None
    if not arr:
        return None
    a = arr[0]; ad = a.get("address", {}); st = ad.get("ISO3166-2-lvl4") or ""; cc = (ad.get("country_code") or "").upper()
    return {"lat": round(float(a["lat"]), 5), "lng": round(float(a["lon"]), 5), "address": (ad.get("house_number", "") + " " + ad.get("road", "")).strip(),
            "city": ad.get("city") or ad.get("town") or ad.get("village") or ad.get("suburb") or "", "state": st.split("-")[-1] if cc == "US" and "-" in st else "", "zip": ad.get("postcode", ""), "cc": cc}


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    x = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(x))


def precise_location(d, f):
    """A café must be plotted at its street address, never at a city centre. Returns a geo dict or None."""
    g = d["geo"]
    if g["address"]:
        return g
    if d.get("place_matches"):                       # a known place record within 350 m of the vague point
        m = d["place_matches"][0]
        return dict(g, lat=round(m["lat"], 5), lng=round(m["lng"], 5))
    if f and f.get("address"):                       # street address read from the sources
        g2 = geocode(f["address"])
        if g2 and g2["address"] and km(g, g2) <= 60 and g2["cc"] == g["cc"]:
            return g2
    return None


def valid_sources(d, f):
    own = {host(d["site"])} if d.get("site") else set()
    own |= {host(x["website"]) for x in d.get("place_matches", []) if x.get("website")}
    if d.get("link") and not re.search(r"yelp|instagram|facebook|reddit|tiktok|google|linktr", d["link"], re.I):
        own.add(host(d["link"]))
    seen, out = set(), []
    for s in (f or {}).get("sources", []):
        h = host(s.get("url", ""))
        if not h or h in own or h in seen or not s.get("names_place") or not s.get("says_matcha"):
            continue
        if s.get("channel") not in ALLOWED_CHANNELS:
            continue
        seen.add(h)
        out.append({"u": s["url"].split("#")[0], "k": "report", "st": 0, "n": 0, "s": []})
    return out


def decide(d, f):
    """Returns (status, note, venue_or_None)."""
    if d["outcome"] == "reject":
        return "rejected", d["reason"], None
    g = precise_location(d, f)
    if g is None:
        if f is None:
            return "checking", WAIT, None
        return "rejected", "no street address: could not place it on the map precisely", None
    base = {"name": d["name"], "cat": "coffee_shop", "cc": g["cc"] or "US", "address": g["address"] or d["address"], "city": g["city"], "state": g["state"], "zip": g["zip"],
            "lat": g["lat"], "lng": g["lng"], "phone": None, "focus": False, "menu": None, "pdf": None, "checked": TODAY, "shared": 0}
    base["id"] = hashlib.md5(f"{d['name']}|{g['lat']}|{g['lng']}".encode()).hexdigest()[:10]
    if d["outcome"] == "list_own_site":
        return "added", "listed: its own site shows matcha", dict(base, url=d["site"], ev=d["ev"], platform=d.get("platform"), conf=0.85, via="web")
    if f and f.get("closed"):
        return "rejected", "reported permanently closed", None
    src = valid_sources(d, f)                       # optional extra links found by a web search; not required
    why = "matched to a known place" if d.get("place_matches") else "address resolves to a street"
    site = d.get("site") or (f or {}).get("site")
    return "added", f"listed on the member's word ({why})", dict(base, url=site, ev=src, platform=None, conf=0.6, via="reported")


def main():
    dossier = json.load(open(f"{SUG}/dossier.json", encoding="utf-8"))
    findings = json.load(open(f"{SUG}/findings.json", encoding="utf-8")) if os.path.exists(f"{SUG}/findings.json") else {}
    venues = json.load(open(VENUES[0], encoding="utf-8"))
    added, log = [], []
    for d in dossier:
        status, note, v = decide(d, findings.get(d["id"]))
        if v:
            if any(o["id"] == v["id"] for o in venues + added):
                status, note, v = "rejected", "duplicate of a venue already added", None
            else:
                added.append(v)
        log.append({"t": TODAY, "id": d["id"], "name": d["name"], "status": status, "note": note})
        print(f"{status:9} {d['name']} : {note}")
        if note != WAIT:
            set_status(d["id"], status, note)
    if added and not DRY:
        shutil.copy(VENUES[0], VENUES[0] + ".bak3")
        for p in VENUES:
            json.dump(venues + added, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(f"{SUG}/review_log.jsonl", "a", encoding="utf-8") as fh:
        for l in log:
            fh.write(json.dumps(l, ensure_ascii=False) + "\n")
    print(f"ADDED {len(added)}" + (" (dry run, nothing written)" if DRY else ""))


if __name__ == "__main__":
    main()
