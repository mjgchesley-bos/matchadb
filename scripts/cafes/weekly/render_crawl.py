"""Read ordering-platform menus that only appear after JavaScript runs (Toast, Square Online, Clover, ChowNow ...).

The normal crawler (crawl2.cjs) already finds a café's ordering link, but those pages build their menu in the browser, so a plain fetch sees
no menu. This renders the page in a headless Chromium, checks the visible text for matcha, and writes results in the crawler's format.

- honest user agent, robots.txt honoured per origin, a short delay per origin
- any bot-verification page (Cloudflare "Performing security verification", "Just a moment", CAPTCHA) is recorded as blocked and is NEVER bypassed;
  after 3 blocks in a row a platform is paused for the rest of the run
usage: python render_crawl.py INPUT.json OUTPUT.jsonl [concurrency] [limit]     (INPUT = [{"host","url"}...], url = the ordering-platform page)
"""
import asyncio, json, os, random, re, sys, time, datetime, urllib.robotparser, urllib.request
from urllib.parse import urlparse
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")
inp, out = sys.argv[1], sys.argv[2]
CONC = int(sys.argv[3]) if len(sys.argv) > 3 else 3
LIMIT = int(sys.argv[4]) if len(sys.argv) > 4 else 0
UA = "Mozilla/5.0 (compatible; MatchaDBBot/1.0; +https://www.matchadb.com)"
M = re.compile(r"\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차", re.I)
CHALLENGE = re.compile(r"performing security verification|just a moment|verify (that )?you are (a )?human|are you a robot|captcha|access denied|attention required", re.I)
TODAY = datetime.date.today().isoformat()
items = json.load(open(inp, encoding="utf-8"))
random.seed(7); random.shuffle(items)
if LIMIT: items = items[:LIMIT]
done = set()
if os.path.exists(out):
    for l in open(out, encoding="utf-8"):
        try: done.add(json.loads(l)["host"])
        except Exception: pass
items = [i for i in items if i["host"] not in done]
print("to do", len(items), flush=True)

robots = {}
def allowed(u):
    o = urlparse(u); key = o.scheme + "://" + o.netloc
    rp = robots.get(key)
    if rp is None:
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(key + "/robots.txt", headers={"User-Agent": UA})
            body = urllib.request.urlopen(req, timeout=8).read().decode("utf-8", "ignore")
            rp.parse(body.splitlines())
        except Exception:
            rp.parse([])            # no robots.txt reachable = nothing disallowed
        robots[key] = rp
    return rp.can_fetch("MatchaDBBot", u)

blocked_run = {}          # platform origin -> consecutive blocks
paused = set()            # platforms given up on for this run (3 cooldowns used)
cooldown_until = {}       # platform -> time before which we do not touch it
cooldowns = {}            # platform -> how many cooldowns used
GAP = {}                  # platform -> seconds between requests (grows after each cooldown)
last_hit = {}
stats = {"ok": 0, "matcha": 0, "blocked": 0, "fail": 0, "robots": 0}
lock = asyncio.Lock()

def snippets(txt):
    s = []
    for m in M.finditer(txt):
        s.append(txt[max(0, m.start() - 90): m.end() + 110].replace("\n", " ").strip())
        if len(s) >= 3: break
    return s

async def one(ctx, it, fout):
    host, url = it["host"], it["url"]
    o = urlparse(url); origin = o.netloc.lower()
    plat = ".".join(origin.split(".")[-2:])
    rec = {"host": host, "url": it.get("site") or url, "at": TODAY, "v": 3, "via": "render"}
    if plat in paused: return
    while time.time() < cooldown_until.get(plat, 0):
        await asyncio.sleep(30)
    if plat in paused: return
    if not allowed(url):
        rec["status"] = "robots"; stats["robots"] += 1
    else:
        async with lock:
            wait = last_hit.get(plat, 0) + GAP.get(plat, 1.2) - time.time()
            last_hit[plat] = time.time() + max(wait, 0)
        if wait > 0: await asyncio.sleep(wait)
        pg = await ctx.new_page()
        try:
            r = await pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            await pg.wait_for_timeout(6500)
            txt = await pg.inner_text("body")
            status = r.status if r else 0
            if status in (403, 429, 503) or CHALLENGE.search(txt[:600]) and len(txt) < 1500:
                rec["status"] = "blocked"; stats["blocked"] += 1
                blocked_run[plat] = blocked_run.get(plat, 0) + 1
                if blocked_run[plat] >= 3:
                    blocked_run[plat] = 0
                    cooldowns[plat] = cooldowns.get(plat, 0) + 1
                    if cooldowns[plat] >= 4:
                        paused.add(plat); print("PAUSED platform", plat, "for good after 3 cooldowns still blocked", flush=True)
                    else:
                        cooldown_until[plat] = time.time() + 1200
                        GAP[plat] = GAP.get(plat, 1.2) * 2
                        print("COOLDOWN 20 min", plat, "round", cooldowns[plat], "gap now", GAP[plat], flush=True)
            else:
                blocked_run[plat] = 0
                hit = bool(M.search(txt))
                rec.update({"status": "ok", "pages": 1, "matcha": hit, "platform": url, "pdf": None,
                            "hits": [{"url": url, "kind": "menu", "visible": True, "count": len(M.findall(txt)), "snippets": snippets(txt)}] if hit else []})
                stats["ok"] += 1; stats["matcha"] += hit
        except Exception as e:
            rec["status"] = "fail:" + type(e).__name__; stats["fail"] += 1
        finally:
            await pg.close()
    fout.write(json.dumps(rec, ensure_ascii=False) + "\n"); fout.flush()

async def main():
    sem = asyncio.Semaphore(CONC)
    n = 0
    with open(out, "a", encoding="utf-8") as fout:
        async with async_playwright() as p:
            b = await p.chromium.launch(headless=True)
            ctx = await b.new_context(user_agent=UA, viewport={"width": 1280, "height": 900})
            async def run(it):
                nonlocal n
                async with sem:
                    await one(ctx, it, fout)
                    n += 1
                    if n % 25 == 0: print(n, stats, flush=True)
            await asyncio.gather(*(run(i) for i in items))
            await b.close()
    print("DONE", len(items), stats, flush=True)

asyncio.run(main())
