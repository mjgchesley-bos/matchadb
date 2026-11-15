"""New cafés from OpenStreetMap's official daily change files (planet.openstreetmap.org/replication/day), turned into leads.

Why: Overture and Foursquare lag new openings by months, and OSM volunteers often map a new café within days. A café only gets on
the map here if ITS OWN website (read in a headless browser, robots.txt honoured, blocks respected) shows matcha: same rule as
every other source. Anything skipped for lack of a website or a street address is not lost; it is picked up if it appears in a later release.

usage: python osm_new_cafes.py [--days 7] [--max-probe 400] [--dry]
state: C:/temp/osm/state.json {"seq": last day-sequence processed}. Failure is non-fatal: the next run resumes from the state.
OSM data (c) OpenStreetMap contributors, ODbL.
"""
import argparse, asyncio, collections, datetime, difflib, glob, gzip, hashlib, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, "C:/temp/cafes/guides")
import verify_leads as V                      # probe(): renders a site + its menu pages and finds matcha; honours robots.txt
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = "C:/Users/mjgch/projects/matchadb"
OSM_DIR = "C:/temp/osm"
STATE = f"{OSM_DIR}/state.json"
BASE = "https://planet.openstreetmap.org/replication/day"
UA = "MatchaDBBot/1.0 (+https://www.matchadb.com)"
VENUES = ["C:/temp/cafes/leads_venues.json", "C:/temp/weekly/leads_venues.json", f"{REPO}/scripts/cafes/weekly/leads_venues.json"]
TODAY = datetime.date.today().isoformat()
DRINKWORD = re.compile(r"latte|iced|drink|beverage|smoothie|lemonade|tonic|boba|bubble tea|frapp|cappuccino|espresso|cortado|milk tea|ラテ|ドリンク|飲み物|라떼|拿铁|奶茶|Getr[aä]nk|boisson|bebida", re.I)
os.makedirs(f"{OSM_DIR}/diffs", exist_ok=True)


def norm(s):
    s = unicodedata.normalize("NFKC", s or "").lower()
    s = re.sub(r"\(.*?\)|（.*?）", "", s)
    return re.sub(r"[^\w]", "", s)


def host(u):
    return urllib.parse.urlparse(u if "//" in (u or "") else "//" + (u or "")).netloc.lower().replace("www.", "")


def http(url, binary=False, retries=3):
    for i in range(retries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120)
            return r.read() if binary else r.read().decode()
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(5 * (i + 1))


def seq_path(n):
    p = f"{n:09d}"
    return f"{BASE}/{p[:3]}/{p[3:6]}/{p[6:]}.osc.gz"


def current_seq():
    return int(re.search(r"sequenceNumber=(\d+)", http(f"{BASE}/state.txt")).group(1))


def fetch_diff(n):
    dest = f"{OSM_DIR}/diffs/{n}.osc.gz"
    if os.path.exists(dest) and os.path.getsize(dest) > 1_000_000:
        return dest
    url = seq_path(n)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=300) as r, open(dest + ".part", "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    os.replace(dest + ".part", dest)
    return dest


def cafes_in_diff(path):
    """Nodes created or modified that carry amenity=cafe and a name (ways have no coordinates in a change file: skipped)."""
    out = {}
    with gzip.open(path, "rb") as f:
        action = None
        for ev, el in ET.iterparse(f, events=("start", "end")):
            if ev == "start":
                if el.tag in ("create", "modify", "delete"):
                    action = el.tag
                continue
            if el.tag == "node" and action in ("create", "modify"):
                tags = {t.get("k"): t.get("v") for t in el.findall("tag")}
                if tags.get("amenity") == "cafe" and tags.get("name") and el.get("lat"):
                    out[el.get("id")] = {"id": el.get("id"), "lat": float(el.get("lat")), "lon": float(el.get("lon")), "tags": tags, "action": action}
            if el.tag in ("node", "way", "relation"):
                el.clear()
            elif el.tag in ("create", "modify", "delete"):
                el.clear()
    return out


def load_map():
    rows = []
    for f in glob.glob(f"{REPO}/data/cafes/*.json"):
        rows += json.load(open(f, encoding="utf-8"))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--max-probe", type=int, default=400)
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    now = current_seq()
    last = json.load(open(STATE))["seq"] if os.path.exists(STATE) else now - a.days
    seqs = list(range(max(last + 1, now - 30), now + 1))
    print("diff days to read:", seqs)
    cand = {}
    for n in seqs:
        try:
            p = fetch_diff(n)
        except Exception as e:
            print("could not fetch day", n, str(e)[:80], "- stopping here; the next run resumes")
            seqs = [s for s in seqs if s < n]
            break
        t = time.time()
        got = cafes_in_diff(p)
        cand.update(got)
        print(f"day {n}: {len(got)} café nodes ({round(time.time() - t)}s)")
        try:
            os.remove(p)                                  # keep disk small; the state file marks the day as done
        except OSError:
            pass
    print("café nodes this run:", len(cand))

    rows = load_map()
    removed = json.load(open(f"{REPO}/data/cafes-removed.json", encoding="utf-8"))
    removed_keys = {(norm(v[0]), norm(v[1])) for v in removed.values()}
    grid = collections.defaultdict(list)
    for r in rows:
        grid[(int(r["lat"] * 4), int(r["lng"] * 4))].append(r)
    namecount = collections.Counter(norm(r["name"]) for r in rows)
    for v in removed.values():
        namecount[norm(v[0])] += 1                       # chains we already removed still count as chains
    hostcount = collections.Counter(host(r.get("url")) for r in rows if r.get("url"))
    members = set(json.load(open(f"{HERE}/member_cafes.json"))) if os.path.exists(f"{HERE}/member_cafes.json") else set()
    existing_ids = set()
    for p in VENUES:
        try:
            existing_ids |= {r["id"] for r in json.load(open(p, encoding="utf-8"))}
        except Exception:
            pass

    stats = collections.Counter()
    todo = []
    for c in cand.values():
        t, lat, lon = c["tags"], c["lat"], c["lon"]
        key = (int(lat * 4), int(lon * 4))
        near = [r for dx in (-1, 0, 1) for dy in (-1, 0, 1) for r in grid.get((key[0] + dx, key[1] + dy), [])]
        if not near:
            stats["outside our coverage"] += 1; continue
        site = t.get("website") or t.get("contact:website") or ""
        if not site:
            stats["no website"] += 1; continue
        if not site.startswith("http"):
            site = "https://" + site
        nm = norm(t["name"])
        def d2(r):
            return (r["lat"] - lat) ** 2 + ((r["lng"] - lon) * 0.8) ** 2
        near.sort(key=d2)
        nr = near[0]
        if d2(nr) > 0.4 ** 2:
            stats["outside our coverage"] += 1; continue
        # same place already listed (same name within ~300 m, or the same website)
        dup = any(((r["lat"] - lat) ** 2 + ((r["lng"] - lon) * 0.8) ** 2) < 0.003 ** 2 and (norm(r["name"]) == nm or nm in norm(r["name"]) or norm(r["name"]) in nm or difflib.SequenceMatcher(None, norm(r["name"]), nm).ratio() > 0.8) for r in near[:60]) \
            or any(host(r.get("url")) == host(site) and abs(r["lat"] - lat) < 0.01 and abs(r["lng"] - lon) < 0.01 for r in near[:60])
        if dup:
            stats["already on the map"] += 1; continue
        city = t.get("addr:city") or nr["city"]
        if (nm, norm(city)) in removed_keys:
            stats["removed earlier"] += 1; continue
        if t.get("brand:wikidata") or t.get("brand") or namecount[nm] >= 6 or hostcount[host(site)] >= 8 or re.search(r"starbucks|dunkin|mcdonald|tim hortons|costa coffee|peet|caribou|dutch bros|7-eleven|seven.?eleven|lawson|family ?mart", t["name"], re.I):
            stats["chain"] += 1; continue
        street, num = t.get("addr:street"), t.get("addr:housenumber")
        if not street:
            stats["no street address"] += 1; continue
        cc = (t.get("addr:country") or nr["cc"] or "US").upper()
        addr = f"{num} {street}".strip() if cc in ("US", "CA", "GB", "AU", "NZ") else f"{street} {num}".strip()
        lead_id = hashlib.md5(f"{t['name']}|{lat:.5f}|{lon:.5f}".encode()).hexdigest()[:10]
        if lead_id in existing_ids:
            stats["already a lead"] += 1; continue
        todo.append({"name": t["name"], "site": site, "lat": round(lat, 5), "lng": round(lon, 5), "address": addr, "city": city, "state": (t.get("addr:state") or nr.get("state") or "") if cc == "US" else (nr.get("state") or ""),
                     "zip": t.get("addr:postcode") or "", "cc": cc, "id": lead_id, "osm": c["id"], "phone": t.get("phone") or t.get("contact:phone")})
    print("candidates to read:", len(todo), dict(stats))
    todo = todo[: a.max_probe]
    added = []

    async def run():
        async with async_playwright() as p:
            b = await p.chromium.launch(headless=True)
            ctx = await b.new_context(user_agent=V.UA, viewport={"width": 1280, "height": 900})
            for d in todo:
                try:
                    pr = await V.probe(ctx, d["site"])
                except Exception as e:
                    stats["site error"] += 1; continue
                if pr["state"] != "ok":
                    stats["site not readable (" + pr["state"] + ")"] += 1; continue
                if not pr["matcha"]:
                    stats["site shows no matcha"] += 1; continue
                drink = any(e["k"] == "menu" or DRINKWORD.search(" ".join(e.get("s", []))) for e in pr["matcha"])
                if not drink:
                    stats["matcha only as a bare mention (not a drink)"] += 1; continue
                lead = {"id": d["id"], "name": d["name"], "cat": "cafe", "cc": d["cc"], "address": d["address"], "city": d["city"], "state": d["state"], "zip": d["zip"],
                        "lat": d["lat"], "lng": d["lng"], "url": d["site"], "phone": d["phone"], "focus": False, "ev": pr["matcha"], "menu": next((e["u"] for e in pr["matcha"] if e["k"] == "menu"), None),
                        "platform": pr.get("platform"), "pdf": None, "checked": TODAY, "shared": 0, "conf": 0.8, "via": "osm"}
                added.append(lead)
                print("  + matcha:", d["name"], "|", d["city"], "|", d["site"])
            await b.close()
    asyncio.run(run())
    print("new leads with matcha on their own site:", len(added), dict(stats))
    if a.dry:
        return
    if added:
        for p in VENUES:
            try:
                dd = json.load(open(p, encoding="utf-8"))
            except Exception:
                continue
            have = {r["id"] for r in dd}
            dd += [x for x in added if x["id"] not in have]
            json.dump(dd, open(p, "w", encoding="utf-8"), ensure_ascii=False)
        with open(f"{OSM_DIR}/new_leads_log.jsonl", "a", encoding="utf-8") as f:
            for x in added:
                f.write(json.dumps({"at": TODAY, "id": x["id"], "name": x["name"], "city": x["city"], "site": x["url"]}, ensure_ascii=False) + "\n")
    if seqs:
        json.dump({"seq": max(seqs)}, open(STATE, "w"))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("osm_new_cafes failed (non-fatal, resumes next run):", str(e)[:200])
