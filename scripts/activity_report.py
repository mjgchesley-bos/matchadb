"""Daily MatchaDB member-activity report.

  python scripts/activity_report.py              # yesterday (Central time) + today so far
  python scripts/activity_report.py 2026-11-10   # that day

Reads the same staff-only event stream as the /admin page (public.admin_events, service role), writes a Markdown report to
G:/My Drive/Claude/matcha/reports/activity-YYYY-MM-DD.md and prints it. Needs SUPABASE_SECRET_KEY in the repo's .env.local
(never printed). Member emails are not included, only usernames.
"""
import collections, datetime as dt, glob, json, os, re, sqlite3, sys, urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = Path("G:/My Drive/Claude/matcha/reports")
URL = "https://gropvtwigbddfikcujhz.supabase.co"
SITE = "https://www.matchadb.com"

def secret():
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if line.startswith("SUPABASE_SECRET_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("SUPABASE_SECRET_KEY not found in .env.local")

KEY = secret()

def rpc(fn, body):
    req = urllib.request.Request(f"{URL}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(), method="POST",
                                 headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def rest(path):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("America/Chicago")
except Exception:
    TZ = dt.timezone(dt.timedelta(hours=-6))

def day_bounds(d):
    a = dt.datetime(d.year, d.month, d.day, tzinfo=TZ)
    return a, a + dt.timedelta(days=1)

# ---- names
profiles = {p["id"]: p["display_name"] for p in rest("profiles?select=id,display_name")}
products = {}
db = sqlite3.connect(f"file:{ROOT.as_posix()}/data/matcha.db?mode=ro", uri=True)
for pid, name, brand in db.execute("select p.id, p.product_name, b.name from products p join brands b on b.id = p.brand_id"):
    products[str(pid)] = f"{name} ({brand})"
cafes = {}
for f in glob.glob(str(ROOT / "public/data/cafes-slim-*.json")):
    for r in json.load(open(f, encoding="utf-8")):
        cafes[r[0]] = r[1] if (r[3] or "").lower() in r[1].lower() else f"{r[1]}, {r[3]}"      # "Sharetea - Austin", not "Sharetea - Austin, Austin"

def where(e):
    t, k = e.get("target_type"), e.get("target_key")
    if t == "product": return f"{products.get(k, 'product #' + str(k))}  <{SITE}/products/{k}>"
    if t == "cafe": return cafes.get(k, f"café {k}")
    if t == "brand": return f"brand {k}"
    if t == "member": return f"member {k}"
    return str(k or "")

def section(title, events, line):
    if not events: return []
    return [f"### {title} ({len(events)})"] + [f"- {line(e)}" for e in events] + [""]

def build(d):
    a, b = day_bounds(d)
    ev = rpc("admin_events", {"p_from": a.isoformat(), "p_to": b.isoformat()})
    for e in ev: e["who"] = profiles.get(e["uid"], "a member")
    ev.sort(key=lambda e: e["at"])
    by = collections.defaultdict(list)
    for e in ev: by[e["kind"]].append(e)
    t = lambda e: dt.datetime.fromisoformat(e["at"].replace("Z", "+00:00")).astimezone(TZ).strftime("%-I:%M %p" if os.name != "nt" else "%I:%M %p").lstrip("0")
    photos = sum(e.get("photos") or 0 for e in by["comment"])
    active = len({e["uid"] for e in ev if e["kind"] != "account"})
    out = [f"## {d.strftime('%A, %B %d, %Y')}", "",
           f"**{len(by['account'])} new accounts · {active} active members · {len(by['comment'])} comments · {photos} photos · {len(by['review'])} reviews · "
           f"{len(by['rating']) + len(by['cafe_rating'])} ratings · {len(by['save']) + len(by['shelf']) + len(by['list'])} saves/shelf adds · {len(by['follow'])} follows · "
           f"{len(by['suggestion'])} café suggestions · {len(by['report'])} reports**", ""]
    out += section("Reports (look at these first)", by["report"], lambda e: f"{t(e)} {e['who']} reported a {e['target_type']}: “{e.get('txt')}”  → open /admin, Reports filter")
    out += section("New accounts", by["account"], lambda e: f"{t(e)} {e['who']}")
    out += section("Comments", by["comment"], lambda e: f"{t(e)} {e['who']} on {where(e)}{' [' + str(e['photos']) + ' photo(s)]' if e.get('photos') else ''}{' [HIDDEN]' if e.get('status') == 'hidden' else ''}: “{(e.get('txt') or '')[:300]}”")
    out += section("Reviews", by["review"], lambda e: f"{t(e)} {e['who']} on {where(e)}{' [HIDDEN]' if e.get('status') == 'hidden' else ''}: “{(e.get('txt') or '')[:300]}”")
    out += section("Café suggestions", by["suggestion"], lambda e: f"{t(e)} {e['who']}: {e.get('txt')} ({e.get('status')})")
    out += section("Ratings", by["rating"] + by["cafe_rating"], lambda e: f"{e['who']} rated {e.get('txt')}★ {where(e)}")
    out += section("Saves, shelves and lists", by["save"] + by["shelf"] + by["list"], lambda e: f"{e['who']}: {e['kind']} {e.get('txt') or ''} {where(e)}")
    out += section("Follows", by["follow"], lambda e: f"{e['who']} followed {e.get('txt')}")
    if not ev: out += ["Nothing happened.", ""]
    return out

if __name__ == "__main__":
    today = dt.datetime.now(TZ).date()
    days = [dt.date.fromisoformat(sys.argv[1])] if len(sys.argv) > 1 else [today - dt.timedelta(days=1), today]
    lines = [f"# MatchaDB member activity", f"Generated {dt.datetime.now(TZ).strftime('%Y-%m-%d %H:%M')} Central. Open {SITE}/admin for the live log; click any comment or review there to read it in full or hide it.", ""]
    for d in days: lines += build(d)
    text = "\n".join(lines)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"activity-{days[0].isoformat()}.md"
    path.write_text(text, encoding="utf-8")
    print(text)
    print(f"\n(saved to {path})")
