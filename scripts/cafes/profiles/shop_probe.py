"""Phase 1 of 'build out café profiles from public info': for every café that sells matcha to take home, read the products from its own online shop
when the shop publishes the standard public product feed (/products.json). Text, prices and product links only (no images, no descriptions).
Polite: honest user agent, robots.txt respected, 1.5 s between requests, any 403/429 stops that site, nothing is retried to get around a block."""
import json, sys, time, re, glob, urllib.request, urllib.parse, urllib.robotparser
sys.path.insert(0, "C:/temp/cafes/progress")
from progress import Task
sys.stdout.reconfigure(encoding="utf-8")
R = "C:/Users/mjgch/projects/matchadb/"
UA = "MatchaDB-profile-check/1.0 (+https://www.matchadb.com)"
th = json.load(open(R + "public/data/take-home.json", encoding="utf-8"))
cafes = {}
for f in glob.glob(R + "data/cafes/*.json"):
    for c in json.load(open(f, encoding="utf-8")):
        cafes[c["id"]] = c
prof = json.load(open(R + "data/cafe-profiles.json", encoding="utf-8"))
todo = [cafes[i] for i in th if i in cafes and cafes[i].get("url") and i not in prof]
prev = json.load(open("C:/temp/shop_probe.json", encoding="utf-8"))
todo = [c for c in todo if prev.get(c["id"], {}).get("status") == "shopify"]
t = Task("shop-probe2", "Reading take-home shops again: matcha products, from-prices", total=len(todo), unit="cafés")

def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,text/plain,*/*"})
    return urllib.request.urlopen(req, timeout=timeout)

KEEP = re.compile(r"matcha|hojicha|houjicha|chasen|chashaku|whisk", re.I)
DROP = re.compile(r"gift ?card|e-?gift|shipping|insurance|subscription|coffee bean|whole bean|ground coffee|t-?shirt|hoodie|sticker|\bmug\b|latte mix|chai", re.I)
out = {}
n = 0
for c in todo:
    n += 1
    o = urllib.parse.urlparse(c["url"])
    origin = f"{o.scheme}://{o.netloc}"
    res = {"id": c["id"], "name": c["name"], "origin": origin, "status": "skipped"}
    try:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(origin + "/robots.txt")
        try:
            rp.read()
        except Exception:
            pass
        if not rp.can_fetch(UA, origin + "/products.json"):
            res["status"] = "robots-disallow"
        else:
            time.sleep(1.5)
            raw = get(origin + "/products.json?limit=250").read()
            prods = json.loads(raw).get("products", [])
            cur = None
            try:
                time.sleep(1.5)
                cur = json.loads(get(origin + "/meta.json").read()).get("currency")
            except Exception:
                pass
            items = []
            for p in prods:
                title = p.get("title", "")
                tags = " ".join(p.get("tags", [])) if isinstance(p.get("tags"), list) else str(p.get("tags", ""))
                hay = f"{title} {p.get('product_type','')} {tags}"
                if DROP.search(hay) or not KEEP.search(hay):
                    continue
                vs = p.get("variants") or [{}]
                ps = sorted(float(x["price"]) for x in vs if x.get("price") not in (None, ""))
                price = ps[0] if ps else None
                multi = len(set(ps)) > 1
                avail = any(x.get("available") for x in p.get("variants", []))
                items.append({"name": title.strip()[:90], "price": price, "from": multi, "available": avail, "url": f"{origin}/products/{p.get('handle')}", "type": p.get("product_type", "")})
            res.update({"status": "shopify" if prods else "empty", "currency": cur, "total_products": len(prods), "items": items})
    except urllib.error.HTTPError as e:
        res["status"] = f"http-{e.code}"
    except Exception as e:
        res["status"] = "no-feed"
    out[c["id"]] = res
    t.update(done=n, detail=f"{c['name'][:40]}: {res['status']}")
    json.dump(out, open("C:/temp/shop_probe2.json", "w", encoding="utf-8"), ensure_ascii=False)
from collections import Counter
t.finish(str(dict(Counter(v["status"] for v in out.values()))))
print(Counter(v["status"] for v in out.values()))
print("with items:", sum(1 for v in out.values() if v.get("items")))
