#!/usr/bin/env python3
"""Refresh data/events-auto.json: the dated, organizer-confirmed tea and matcha festivals around the world.

Runs on a schedule (see .github/workflows/refresh-events.yml) with no LLM and no paid service. Standard library only.
  1. Reads MyTeaPal's public festival listing (robots.txt allows it) for events that have a confirmed date.
  2. Opens each event's page there for the venue, how sure the date is, and the organizer's own website.
  3. Finds coordinates with OpenStreetMap's Nominatim (1 request a second, results cached in data/geocache.json).
  4. Drops events that have already finished, and writes the file only if something changed.
Only facts are kept (name, date, place, organizer link); the site links to the organizer, not to the listing.
"""
import datetime, html, json, os, re, sys, time, urllib.parse, urllib.request, urllib.robotparser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "events-auto.json")
GEO = os.path.join(ROOT, "data", "geocache.json")
UA = "MatchaDBBot/1.0 (+https://www.matchadb.com)"
BASE = "https://www.myteapal.com"
MONTHS = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
CONTINENT = {}
for cont, names in {
    "North America": "United States|Canada|Mexico|Costa Rica|Panama|Guatemala|Jamaica|Dominican Republic|Puerto Rico",
    "South America": "Brazil|Argentina|Chile|Colombia|Peru|Uruguay|Ecuador|Bolivia",
    "Europe": "United Kingdom|Ireland|France|Germany|Italy|Spain|Portugal|Netherlands|Belgium|Luxembourg|Austria|Switzerland|Sweden|Norway|Denmark|Finland|Iceland|Poland|Czechia|Slovakia|Hungary|Greece|Romania|Bulgaria|Croatia|Slovenia|Estonia|Latvia|Lithuania|Ukraine|Russia|Serbia|Malta|Cyprus|Turkey",
    "Asia": "Japan|China|South Korea|Taiwan|Hong Kong|India|Sri Lanka|Thailand|Vietnam|Singapore|Malaysia|Indonesia|Philippines|Nepal|Georgia|United Arab Emirates|Israel|Kazakhstan",
    "Oceania": "Australia|New Zealand",
    "Africa": "South Africa|Kenya|Morocco|Egypt|Nigeria|Ghana|Rwanda|Tanzania|Uganda",
}.items():
    for n in names.split("|"):
        CONTINENT[n] = cont
SKIP_HOSTS = re.compile(r"(myteapal|instagram|facebook|twitter|x\.com|youtube|tiktok|discord|eventbrite|artshub|ticketmaster|meetup|google|linktr)", re.I)

rp = urllib.robotparser.RobotFileParser()
rp.set_url(BASE + "/robots.txt")
try:
    rp.read()
except Exception:
    pass

def get(url):
    if not rp.can_fetch(UA, url):
        raise RuntimeError("robots.txt disallows " + url)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

def text(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()

def parse_dates(s):
    s = s.replace("–", "-").replace("—", "-").strip()
    m = re.fullmatch(r"(\d{1,2}) ([A-Za-z]{3}) (\d{4})", s)
    if m:
        d = datetime.date(int(m[3]), MONTHS[m[2]], int(m[1])); return d, None
    m = re.fullmatch(r"(\d{1,2})-(\d{1,2}) ([A-Za-z]{3}) (\d{4})", s)
    if m:
        mo = MONTHS[m[3]]; return datetime.date(int(m[4]), mo, int(m[1])), datetime.date(int(m[4]), mo, int(m[2]))
    m = re.fullmatch(r"(\d{1,2}) ([A-Za-z]{3})-(\d{1,2}) ([A-Za-z]{3}) (\d{4})", s)
    if m:
        y = int(m[5]); return datetime.date(y, MONTHS[m[2]], int(m[1])), datetime.date(y, MONTHS[m[4]], int(m[3]))
    return None, None

geo = json.load(open(GEO, encoding="utf-8")) if os.path.exists(GEO) else {}
def organizer_shows_date(url, start):
    """True when the organizer's own page mentions the event's day and month (a light check, not proof)."""
    try:
        host = urllib.parse.urlparse(url)
        orp = urllib.robotparser.RobotFileParser()
        orp.set_url(f"{host.scheme}://{host.netloc}/robots.txt")
        try:
            orp.read()
        except Exception:
            pass
        if not orp.can_fetch(UA, url):
            return False
        time.sleep(1.2)
        page = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=25).read(600000).decode("utf-8", "ignore")
    except Exception:
        return False
    t = text(re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S))
    mon_long = start.strftime("%B"); mon_short = start.strftime("%b"); day = str(start.day)
    rx = rf"(\b{day}(?:st|nd|rd|th)?\b.{{0,12}}\b({mon_long}|{mon_short})\b)|(\b({mon_long}|{mon_short})\b.{{0,12}}\b{day}(?:st|nd|rd|th)?\b)"
    return bool(re.search(rx, t, re.I))

def geocode(city, country):
    key = f"{city}, {country}"
    if key in geo:
        return geo[key]
    time.sleep(1.2)
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": key, "format": "json", "limit": 1})
    try:
        j = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30).read().decode("utf-8"))
        geo[key] = [float(j[0]["lat"]), float(j[0]["lon"])] if j else None
    except Exception as e:
        print("geocode failed", key, str(e)[:60]); return None
    return geo[key]

def main():
    today = datetime.date.today()
    page = get(BASE + "/tea-festivals")
    items = re.findall(r'<span[^>]*font-medium">([^<]+)</span></span><h3[^>]*><a[^>]*href="(/tea-festivals/[^"]+)">([^<]+)</a></h3><p[^>]*>([^<]+)</p>', page)
    print("listing cards with a date:", len(items))
    out = []
    for dates, href, name, place in items:
        start, end = parse_dates(html.unescape(dates))
        if not start or (end or start) < today:
            continue
        name = html.unescape(name).strip()
        loc = html.unescape(place).split("·")[0].strip()
        city, _, country = loc.rpartition(", ")
        if not city:
            city, country = loc, ""
        continent = CONTINENT.get(country)
        try:
            d = get(BASE + href)
        except Exception as e:
            print("skip", name, str(e)[:60]); continue
        time.sleep(1.2)
        t = text(d)
        said_confirmed = bool(re.search(r"Dates confirmed by the organizer", t))
        venue = (re.search(r"Venue\s*:\s*(.+?)(?=Sign in|Sources|Organizer|Questions|$)", t) or [None, None])[1]
        m = re.search(r"Sources(?:<!-- -->)?:</span>(.*?)</p>", d, re.S)
        if venue:
            venue = re.split(r"\s+(?:Admission|\d+(?:st|nd|rd|th)|Going|Interested|Calendar|Share|Guests)", venue)[0].strip(" ,:") or None
        block = m.group(1) if m else ""
        links = [u for u in re.findall(r'href="(https?://[^"]+)"', block) if not SKIP_HOSTS.search(u)]
        url = links[0] if links else None
        if not url or not continent:
            print("skip (no organizer link or unknown country):", name, country); continue
        # "confirmed" only when the organizer's own page shows the date; otherwise "reported" (the organizer confirmed it to a public listing).
        sure = "confirmed" if organizer_shows_date(url, start) else ("reported" if said_confirmed else "listed")
        ll = geocode(city, country)
        if not ll:
            print("skip (no coordinates):", name, city); continue
        out.append({
            "id": "auto-" + re.sub(r"[^a-z0-9]+", "-", f"{name}-{start.year}".lower()).strip("-"),
            "name": name, "kind": "trade show" if re.search(r"expo|conference|summit", name, re.I) else "tea festival",
            "start": start.isoformat(), **({"end": end.isoformat()} if end else {}),
            "city": city, "country": country, "continent": continent, **({"venue": venue.strip()} if venue else {}),
            "lat": round(ll[0], 4), "lng": round(ll[1], 4),
            "url": url, "source": "Organizer's site (date found via a public tea-festival listing)", "confidence": sure,
            "checked": today.isoformat(),
        })
    out.sort(key=lambda e: e["start"])
    json.dump(geo, open(GEO, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
    new = json.dumps(out, ensure_ascii=False, indent=1) + "\n"
    old = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    # Ignore the "checked" date when deciding whether anything changed, so the file is not rewritten every run for nothing.
    strip = lambda s: re.sub(r'"checked": "[^"]*"', "", s)
    if strip(new) == strip(old):
        print("no change"); return
    open(OUT, "w", encoding="utf-8").write(new)
    print("wrote", len(out), "events")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("refresh failed, leaving the saved events as they are:", e); sys.exit(0)
