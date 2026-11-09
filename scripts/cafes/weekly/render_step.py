"""Weekly step: read JavaScript-built ordering-platform menus (Toast, Square Online, Clover, ChowNow) with render_crawl.py.

Picks, among sites whose own page links to one of those platforms:
  new     never rendered before
  listed  currently listed thanks to a rendered menu (re-read every week so the evidence stays fresh)
  rotate  one sixth of the rest, so every site is re-read about every 6 weeks
Writes w_render_<TAG>.jsonl (a weekly file: the build lets a fresh read replace the old one; a blocked page never removes anything).
usage: python -I render_step.py [--max N]
"""
import datetime, glob, json, os, re, subprocess, sys, zlib

sys.stdout.reconfigure(encoding="utf-8")
WORK = "C:/temp/cafes"
HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = datetime.date.today()
TAG = TODAY.strftime("%Y%m%d")
WEEK = TODAY.isocalendar()[1]
P = re.compile(r"toasttab\.com|square\.site|squareup\.com|clover\.com|chownow\.com", re.I)
MAXN = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 0

site_res, rendered, listed_r = {}, {}, set()
files = [f"{WORK}/{n}" for n in ("crawl.jsonl", "crawl_intl.jsonl", "crawl_intl_retry.jsonl")] + sorted(glob.glob(f"{WORK}/v2_*.jsonl")) + sorted(glob.glob(f"{WORK}/w_*.jsonl"))
for f in files:
    if not os.path.exists(f): continue
    for l in open(f, encoding="utf-8"):
        try: r = json.loads(l)
        except Exception: continue
        h = r.get("host")
        if not h: continue
        if r.get("via") == "render":
            if r.get("status") == "ok":
                rendered[h] = r
                if r.get("matcha"): listed_r.add(h)
                else: listed_r.discard(h)
            continue
        if r.get("status") == "ok":
            old = site_res.get(h) or {}
            site_res[h] = {"url": r.get("url"), "platform": r.get("platform") or old.get("platform"), "matcha": bool(r.get("matcha")) or bool(old.get("matcha"))}

items = []
for h, r in site_res.items():
    pl = r.get("platform")
    if not pl or not P.search(pl): continue
    if h in listed_r: why = "listed"
    elif h not in rendered: why = "new"
    elif not r["matcha"] and zlib.crc32(h.encode()) % 6 == WEEK % 6: why = "rotate"
    else: continue
    items.append({"host": h, "url": pl, "site": r["url"], "why": why})
print("render set:", {k: sum(1 for i in items if i["why"] == k) for k in ("new", "listed", "rotate")}, "total", len(items), flush=True)
if MAXN: items = items[:MAXN]
if not items: sys.exit(0)
hosts_file = f"{WORK}/w_render_hosts_{TAG}.json"
out = f"{WORK}/w_render_{TAG}.jsonl"
json.dump(items, open(hosts_file, "w", encoding="utf-8"))
if os.path.exists(out): os.remove(out)
subprocess.run([sys.executable, "-I", f"{HERE}/render_crawl.py", hosts_file, out, "4"], check=False)
