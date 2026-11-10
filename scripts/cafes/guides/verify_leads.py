"""Check each guide lead on the café's OWN site (rendered in a headless browser, like a visitor would see it).

A lead is promoted to a listing only when
  1. the café's own site (home page, menu page or its ordering page) shows matcha, and
  2. we know where it is: from our place data, or by geocoding its name inside the metro, and
  3. a site found only through a guide link also names the city, zip or street (so we never attach the wrong same-named site).
Everything else stays a lead. Honest user agent, robots.txt honoured, never bypasses a bot check.
usage: python -I verify_leads.py [--limit N]   ->  guides/verified.json, guides/pending.json
"""
import asyncio, hashlib, json, math, os, re, sys, time, urllib.parse, urllib.request, urllib.robotparser, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
sys.path.insert(0, "C:/temp/cafes/progress")
from progress import Task

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (compatible; MatchaDBBot/1.0; +https://www.matchadb.com)"
M = re.compile(r"\bmatchas?\b|\bmaccha\b|抹茶", re.I)
CHALLENGE = re.compile(r"performing security verification|just a moment|verify (that )?you are (a )?human|are you a robot|captcha|access denied|attention required", re.I)
PLATFORM = re.compile(r"toasttab\.com|toast\.app|square\.site|clover\.com|chownow\.com|order\.online|olo\.com|getbento|popmenu|menufy|spoton\.com|tock", re.I)
MENU = re.compile(r"menu|order|drinks?|eat|beverage|tea", re.I)
GENERIC = re.compile(r"\b(coffee|cafe|caf|roasters?|roastery|roasting|tea|teas|house|shop|bar|co|company|the|and|bakery|kitchen|eatery|matcha|studio|lab|club|market)\b")
TODAY = datetime.date.today().isoformat()
LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0

CENTER = {"Austin": (30.27, -97.74), "New York": (40.73, -73.99), "Los Angeles": (34.05, -118.24), "Chicago": (41.88, -87.63), "Dallas": (32.78, -96.80),
          "Houston": (29.76, -95.37), "Washington": (38.90, -77.04), "Philadelphia": (39.95, -75.17), "Miami": (25.77, -80.19), "Atlanta": (33.75, -84.39),
          "Boston": (42.36, -71.06), "Phoenix": (33.45, -112.07), "San Francisco": (37.77, -122.42), "Riverside": (33.98, -117.38), "Detroit": (42.33, -83.05),
          "Seattle": (47.61, -122.33), "Minneapolis": (44.98, -93.27), "San Diego": (32.72, -117.16), "Tampa": (27.95, -82.46), "Denver": (39.74, -104.99),
          "Baltimore": (39.29, -76.61), "St. Louis": (38.63, -90.20), "Orlando": (28.54, -81.38), "Charlotte": (35.23, -80.84), "San Antonio": (29.42, -98.49),
          "Portland": (45.52, -122.68)}


def norm(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    return re.sub(r"\s+", "", GENERIC.sub(" ", re.sub(r"[^a-z0-9 ]", " ", s)))


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    x = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(x))


def stem(url):
    h = urllib.parse.urlparse(url).netloc.lower().replace("www.", "")
    return norm(h.rsplit(".", 1)[0] if "." in h else h)


def pick_site(row):
    if row.get("site") and not re.search(r"toasttab|toast\.app|square\.site|squareup|clover\.com|chownow|facebook|instagram|linktr\.ee|linktree|google|yelp|wixsite|godaddysites|business\.site", row["site"]):
        return "https://" + row["site"], "place"
    n = norm(row["name"])
    best = None
    for text, href in row.get("links", []):
        st = stem(href)
        if len(n) >= 4 and len(st) >= 4 and (n in st or st in n or norm(text) == n):
            best = href
            break
    return (best, "guide") if best else (None, None)


robots = {}


def allowed(u):
    o = urllib.parse.urlparse(u)
    key = f"{o.scheme}://{o.netloc}"
    rp = robots.get(key)
    if rp is None:
        rp = urllib.robotparser.RobotFileParser()
        try:
            rp.parse(urllib.request.urlopen(urllib.request.Request(key + "/robots.txt", headers={"User-Agent": UA}), timeout=8).read().decode("utf-8", "ignore").splitlines())
        except Exception:
            rp.parse([])
        robots[key] = rp
    return rp.can_fetch("MatchaDBBot", u)


def snips(txt):
    out = []
    for m in M.finditer(txt):
        out.append(txt[max(0, m.start() - 90): m.end() + 110].replace("\n", " ").strip())
        if len(out) >= 3:
            break
    return out


async def read_page(ctx, url, wait_ms):
    if not allowed(url):
        return None, "robots", []
    pg = await ctx.new_page()
    try:
        r = await pg.goto(url, wait_until="domcontentloaded", timeout=28000)
        await pg.wait_for_timeout(wait_ms)
        txt = await pg.inner_text("body")
        if (r and r.status in (403, 429, 503)) or (CHALLENGE.search(txt[:600]) and len(txt) < 1500):
            return None, "blocked", []
        links = await pg.eval_on_selector_all("a[href]", "els => els.map(e => [(e.innerText||'').trim().slice(0,40), typeof e.href === 'string' ? e.href : ''])")
        links = [(t, u) for t, u in links if isinstance(u, str) and u]
        return txt, "ok", links
    except Exception as e:
        return None, "fail:" + type(e).__name__, []
    finally:
        await pg.close()


async def probe(ctx, site):
    """Home page, then up to 3 menu / ordering pages. Returns what a visitor would see."""
    res = {"site": site, "pages": [], "matcha": [], "text": "", "state": "ok"}
    txt, st, links = await read_page(ctx, site, 3500)
    if txt is None:
        res["state"] = st
        return res
    res["text"] = txt[:6000]
    if M.search(txt):
        res["matcha"].append({"u": site, "k": "home", "st": 2, "n": len(M.findall(txt)), "s": snips(txt)})
    host = urllib.parse.urlparse(site).netloc.lower().replace("www.", "")
    cand, seen = [], {site.rstrip("/")}
    for t, u in links:
        if not isinstance(u, str) or not u.startswith("http") or "#" in u.split("/")[-1] and not PLATFORM.search(u):
            continue
        uh = urllib.parse.urlparse(u).netloc.lower().replace("www.", "")
        if re.search(r"squareup\.com/gift|doordash|ubereats|grubhub|instagram|facebook|google|yelp|career|/jobs?|hiring|employment|press|privacy|terms", u, re.I) or re.search(r"career|jobs?|hiring|employment|press|privacy|terms", t, re.I):
            continue
        if PLATFORM.search(u) or (uh == host and MENU.search(t + " " + urllib.parse.urlparse(u).path)):
            key = u.split("#")[0].rstrip("/")
            if key not in seen:
                seen.add(key)
                cand.append((0 if PLATFORM.search(u) else 1, u))
    cand.sort()
    for _, u in cand[:3]:
        t2, s2, _l = await read_page(ctx, u, 6000)
        if t2 and M.search(t2):
            res["matcha"].append({"u": u, "k": "menu", "st": 3, "n": len(M.findall(t2)), "s": snips(t2)})
            res["platform"] = u if PLATFORM.search(u) else None
        res["text"] += " " + (t2 or "")[:3000]
        res["pages"].append(u)
    return res


def geocode(q, metro):
    time.sleep(1.1)
    try:
        u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=us&addressdetails=1&q=" + urllib.parse.quote(q)
        arr = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "MatchaDBBot/1.0 (+https://www.matchadb.com)"}), timeout=15).read())
    except Exception:
        return None
    for a in arr:
        la, lo = float(a["lat"]), float(a["lon"])
        if km(CENTER[metro], (la, lo)) <= 60:
            ad = a.get("address", {})
            return {"lat": round(la, 5), "lng": round(lo, 5), "address": (ad.get("house_number", "") + " " + ad.get("road", "")).strip(), "city": ad.get("city") or ad.get("town") or ad.get("village") or ad.get("suburb") or "", "zip": ad.get("postcode", "")}
    return None


async def main():
    rows = json.load(open(f"{HERE}/leads_resolved.json", encoding="utf-8"))
    todo = []
    for r in rows:
        if r["status"] in ("listed", "chain", "listed_elsewhere"):
            continue
        site, how = pick_site(r)
        if site:
            todo.append((r, site, how))
    if LIMIT:
        todo = todo[:LIMIT]
    print("to verify", len(todo), "of", sum(1 for r in rows if r["status"] not in ("listed", "chain", "listed_elsewhere")), "unlisted leads", flush=True)
    verified, pending = [], []
    sem = asyncio.Semaphore(3)
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(user_agent=UA, viewport={"width": 1280, "height": 900})

        task = Task("guide-verify", "Checking guide cafés on their own sites", total=len(todo), unit="cafés", detail="starting")
        finished = [0]

        def save():
            json.dump(verified, open(f"{HERE}/verified.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            json.dump(pending, open(f"{HERE}/pending.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

        async def one(r, site, how):
            try:
                await one_inner(r, site, how)
            except Exception as e:
                r["why"] = "error: " + type(e).__name__
                pending.append(r)
            finished[0] += 1
            task.update(done=finished[0], detail=f"{len(verified)} confirmed so far · last: {r['name']}")
            if finished[0] % 5 == 0:
                save()

        async def one_inner(r, site, how):
            async with sem:
                pr = await probe(ctx, site)
            r["probe_state"], r["site_used"], r["site_how"] = pr["state"], site, how
            if not pr["matcha"]:
                r["why"] = "own site shows no matcha" if pr["state"] == "ok" else f"site not readable ({pr['state']})"
                pending.append(r)
                return
            txt = pr["text"].lower()
            city_ok = r.get("city") and r["city"].lower() in txt or (r.get("zip") and str(r["zip"])[:5] in txt) or r["metro"].lower().split(",")[0] in txt
            if how == "guide" and not city_ok:
                r["why"] = "site not shown to be in this city"
                pending.append(r)
                return
            loc = None
            if r.get("lat") is not None:
                loc = {"lat": r["lat"], "lng": r["lng"], "address": r.get("address") or "", "city": r.get("city") or "", "zip": r.get("zip") or ""}
            else:
                loc = geocode(f"{r['name']}, {r['metro']}, {r['state']}", r["metro"])
                if not loc:
                    m = re.search(r"\b(\d{2,5}\s+[A-Za-z0-9 .]{3,30}?\s(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Way|Ln|Lane|Pkwy|Hwy|Pl|Ct)\b\.?)[,\s]+([A-Za-z .]+),?\s+([A-Z]{2})\b", pr["text"])
                    if m:
                        loc = geocode(f"{m.group(1)}, {m.group(2)}, {m.group(3)}", r["metro"])
                        if loc:
                            loc["address"] = loc["address"] or m.group(1)
            if not loc:
                r["why"] = "matcha on own site but location not found"
                r["evidence"] = pr["matcha"]
                pending.append(r)
                return
            cid = hashlib.md5(f"{r['name']}|{loc['lat']}|{loc['lng']}".encode()).hexdigest()[:10]
            verified.append({"id": cid, "name": r["name"], "cat": "coffee_shop", "cc": "US", "address": loc["address"], "city": loc["city"] or r["metro"], "state": r["state"], "zip": loc["zip"],
                             "lat": loc["lat"], "lng": loc["lng"], "url": site, "phone": None, "focus": False, "ev": pr["matcha"], "menu": None,
                             "platform": pr.get("platform"), "pdf": None, "checked": TODAY, "conf": 0.85, "shared": 0, "via": "web", "_src": r["src"], "_how": how})

        await asyncio.gather(*(one(*t) for t in todo))
        await b.close()
    save()
    task.finish(f"{len(verified)} confirmed with matcha on their own site, {len(pending)} left as leads")
    print("verified", len(verified), "pending", len(pending))


asyncio.run(main())
