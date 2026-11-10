"""Match guide leads against what we already know.

For each lead (a café name a local guide mentions near the word matcha) decide:
  listed          already on the map
  chain           a name with many outlets (not listed on purpose)
  site_no_matcha  we know the place, its own site was read, and it shows no matcha  (guide and site disagree: keep out)
  site_unread     we know the place and it has a site, but the crawl never read it (failed or blocked): re-crawl
  no_site         we know the place, it has no website: cannot be verified on its own site
  absent          in none of our place datasets
usage: python -I resolve_leads.py   ->  guides/leads_resolved.json
"""
import collections, difflib, glob, json, math, os, re, sys, unicodedata
import duckdb

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = "C:/temp/cafes"
REPO = "C:/Users/mjgch/projects/matchadb"

CENTER = {"Austin": (30.27, -97.74), "New York": (40.73, -73.99), "Los Angeles": (34.05, -118.24), "Chicago": (41.88, -87.63), "Dallas": (32.78, -96.80),
          "Houston": (29.76, -95.37), "Washington": (38.90, -77.04), "Philadelphia": (39.95, -75.17), "Miami": (25.77, -80.19), "Atlanta": (33.75, -84.39),
          "Boston": (42.36, -71.06), "Phoenix": (33.45, -112.07), "San Francisco": (37.77, -122.42), "Riverside": (33.98, -117.38), "Detroit": (42.33, -83.05),
          "Seattle": (47.61, -122.33), "Minneapolis": (44.98, -93.27), "San Diego": (32.72, -117.16), "Tampa": (27.95, -82.46), "Denver": (39.74, -104.99),
          "Baltimore": (39.29, -76.61), "St. Louis": (38.63, -90.20), "Orlando": (28.54, -81.38), "Charlotte": (35.23, -80.84), "San Antonio": (29.42, -98.49),
          "Portland": (45.52, -122.68)}
RADIUS_KM = 60

GENERIC = re.compile(r"\b(coffee|cafe|caf|roasters?|roastery|roasting|tea|teas|house|shop|bar|co|company|the|and|bakery|kitchen|eatery|matcha|studio|lab|club|market)\b")


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"&", " and ", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = GENERIC.sub(" ", s)
    return re.sub(r"\s+", "", s)


def host(u):
    m = re.match(r"^(?:https?://)?([^/?#]+)", str(u or "").strip().lower())
    return re.sub(r"^www\.", "", m.group(1)) if m else ""


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    x = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(x))


def same(a, b):
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) >= 5 and len(b) >= 5 and (a in b or b in a):
        return True
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.88


# ---- what is listed on the map
listed = collections.defaultdict(list)                     # state -> [(norm, lat, lng, name)]
for f in glob.glob(f"{REPO}/data/cafes/??.json"):
    st = os.path.basename(f)[:2]
    for c in json.load(open(f, encoding="utf-8")):
        listed[st].append((norm(c["name"]), c.get("lat"), c.get("lng"), c["name"]))

# ---- every place we know about (US datasets), with website
con = duckdb.connect()
places = []
for pq in ("us_cafes", "ext_cands", "fsq_all_cands"):
    p = f"{WORK}/{pq}.parquet"
    cols = {c[0] for c in con.execute(f"describe select * from '{p}'").fetchall()}
    cc = "cc" if "cc" in cols else "'US'"
    for r in con.execute(f"select name,lat,lng,website,state,{cc},address,city,zip from '{p}' where lat is not null").fetchall():
        if r[5] == "US":
            places.append((norm(r[0]), r[1], r[2], host(r[3]), r[4], r[0], r[6], r[7], r[8]))
print("places", len(places), "listed states", len(listed), flush=True)
by_name = collections.defaultdict(list)
for pl in places:
    by_name[pl[0]].append(pl)

# ---- crawl status of each site host
site = {}
files = [f"{WORK}/{n}" for n in ("crawl.jsonl", "crawl_intl.jsonl", "crawl_intl_retry.jsonl")] + sorted(glob.glob(f"{WORK}/v2_*.jsonl")) + sorted(glob.glob(f"{WORK}/w_*.jsonl"))
for f in files:
    if not os.path.exists(f):
        continue
    for l in open(f, encoding="utf-8"):
        try:
            r = json.loads(l)
        except Exception:
            continue
        h = host(r.get("host"))
        if not h:
            continue
        old = site.get(h, {})
        ok = r.get("status") == "ok"
        site[h] = {"ok": ok or old.get("ok", False), "matcha": bool(r.get("matcha")) or old.get("matcha", False)}

leads = json.load(open(f"{HERE}/leads_raw.json", encoding="utf-8"))
# places near each metro, computed once (the full list is millions of rows)
near_pl = {m: [pl for pl in places if abs(pl[1] - c[0]) < 1.0 and abs(pl[2] - c[1]) < 1.3 and km(c, (pl[1], pl[2])) <= RADIUS_KM] for m, c in CENTER.items() if m in {l["metro"] for l in leads}}
print({m: len(v) for m, v in near_pl.items()}, flush=True)
seen, out = set(), []
for L in leads:
    key = (L["metro"], norm(L["name"]))
    if len(key[1]) < 3 or key in seen:
        continue
    seen.add(key)
    n, c, st = key[1], CENTER[L["metro"]], L["state"]
    near = lambda lat, lng: lat is not None and lng is not None and km(c, (lat, lng)) <= RADIUS_KM
    row = {"metro": L["metro"], "state": st, "name": L["name"], "src": L["src"], "ctx": L["ctx"][:300], "links": L.get("links", [])}
    hit = next((x for x in listed.get(st, []) if near(x[1], x[2]) and same(n, x[0])), None)
    if hit:
        row.update(status="listed", match=hit[3])
        out.append(row); continue
    cand = [pl for pl in near_pl[L["metro"]] if same(n, pl[0])]
    allname = by_name.get(n, [])
    if len(allname) >= 25 and len({pl[3] for pl in allname if pl[3]}) <= 3 + 0.15 * len(allname):
        row.update(status="chain", outlets=len(allname)); out.append(row); continue
    if not cand:
        row.update(status="absent", outlets=len(allname)); out.append(row); continue
    pl = cand[0]
    row.update(match=pl[5], lat=pl[1], lng=pl[2], site=pl[3], outlets=len(allname), address=pl[6], city=pl[7], zip=pl[8], pstate=pl[4])
    if not pl[3]:
        row["status"] = "no_site"
    else:
        s = site.get(pl[3])
        row["status"] = "site_no_matcha" if (s and s["ok"] and not s["matcha"]) else ("site_unread" if not (s and s["ok"]) else "listed_elsewhere")
    out.append(row)

json.dump(out, open(f"{HERE}/leads_resolved.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
cnt = collections.Counter(r["status"] for r in out)
print("distinct leads", len(out), dict(cnt))
by_m = collections.defaultdict(collections.Counter)
for r in out:
    by_m[r["metro"]][r["status"]] += 1
for m, c in sorted(by_m.items()):
    print(f"{m:15}", dict(c))
