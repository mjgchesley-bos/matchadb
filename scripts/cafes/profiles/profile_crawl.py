"""Build out café profiles from each café's own public pages (verifiable, first-party, nothing from memory).
  python profile_crawl.py shops   -> take-home cafés whose shop has no standard product feed: read products from public structured data (WooCommerce store API, JSON-LD Product)
  python profile_crawl.py menus N -> the N cafés with the most search traffic: read matcha menu lines with prices from their own menu pages
Polite: honest UA, robots.txt respected, 1.5 s between requests, 403/429 stops that site (never retried or worked around), max a handful of pages per site.
Drafts only: writes C:/temp/crawl_<mode>.json; a separate step applies reviewed results."""
import json, sys, time, re, glob, html, urllib.request, urllib.parse, urllib.robotparser, urllib.error
sys.path.insert(0, "C:/temp/cafes/progress")
from progress import Task
sys.stdout.reconfigure(encoding="utf-8")
R = "C:/Users/mjgch/projects/matchadb/"
UA = "MatchaDB-profile-check/1.0 (+https://www.matchadb.com)"
mode = sys.argv[1]
cafes = {}
for f in glob.glob(R + "data/cafes/*.json"):
    for c in json.load(open(f, encoding="utf-8")):
        cafes[c["id"]] = c
prof = json.load(open(R + "data/cafe-profiles.json", encoding="utf-8"))

_robots = {}
class Blocked(Exception): pass
def allowed(url):
    o = urllib.parse.urlparse(url); k = o.netloc
    if k not in _robots:
        rp = urllib.robotparser.RobotFileParser(); rp.set_url(f"{o.scheme}://{k}/robots.txt")
        try: rp.read()
        except Exception: pass
        _robots[k] = rp
    return _robots[k].can_fetch(UA, url)
_last = {}
def get(url, accept="text/html,application/json;q=0.9,*/*;q=0.5", maxb=600000):
    if not allowed(url): raise Blocked("robots")
    k = urllib.parse.urlparse(url).netloc
    w = 1.5 - (time.time() - _last.get(k, 0))
    if w > 0: time.sleep(w)
    _last[k] = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=20) as r:
        ct = r.headers.get("Content-Type", "")
        return r.read(maxb).decode(r.headers.get_content_charset() or "utf-8", "replace"), ct

def text_lines(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg|head)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)</(p|div|li|tr|h\d|section|article|ul|ol|table|dd|dt|figure|br)\s*>|<br\s*/?>", "\n", h)
    h = re.sub(r"(?is)<[^>]+>", " ", h)
    h = html.unescape(h)
    return [re.sub(r"\s+", " ", l).strip() for l in h.split("\n") if l.strip()]

PRICE = r"(?:[$£€¥]\s?\d{1,4}(?:[.,]\d{1,2})?|\d{1,4}(?:[.,]\d{2})\s?(?:[$£€]|kč|czk|eur|usd|gbp)|\d{1,4}\s?(?:kč|czk))"
PRICE_RE = re.compile(PRICE, re.I)
MATCHA = re.compile(r"matcha|hojicha|houjicha|抹茶|말차", re.I)
JUNK = re.compile(r"shipping|subscri|free |off\b|% |sale|save |gift ?card|cookie|newsletter|©|copyright|reserved|login|sign in|cart|tax|tips?\b|since \d{4}", re.I)

if mode == "shops":
    prev = json.load(open("C:/temp/shop_probe.json", encoding="utf-8"))
    ids = [i for i, v in prev.items() if v["status"] in ("http-404", "no-feed") and i in cafes and cafes[i].get("url") and not prof.get(i, {}).get("shop")]
elif mode == "menus":
    n = int(sys.argv[2])
    tr = json.load(open("C:/temp/cafe_traffic.json", encoding="utf-8"))
    done = json.load(open("C:/temp/crawl_menus.json", encoding="utf-8")) if len(sys.argv) > 3 else {}
    ids = [x["id"] for x in tr if x["url"] and not re.search(r"instagram|facebook|linktr|tiktok", x["url"]) and not (prof.get(x["id"], {}).get("menu"))][:n]
t = Task("crawl-" + mode, "Profiles from public info: " + ("shops without a feed" if mode == "shops" else "menus of the most-searched cafés"), total=len(ids), unit="cafés")
out = {}

def ld_products(h):
    res = []
    for m in re.finditer(r'(?is)<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', h):
        try: j = json.loads(m.group(1).strip())
        except Exception: continue
        stack = [j]
        while stack:
            x = stack.pop()
            if isinstance(x, list): stack += x
            elif isinstance(x, dict):
                ty = x.get("@type")
                if isinstance(x.get("@graph"), list): stack += x["@graph"]
                if ty == "Product" or (isinstance(ty, list) and "Product" in ty):
                    off = x.get("offers")
                    offs = off if isinstance(off, list) else [off] if off else []
                    prices = []
                    cur = None
                    for o in offs:
                        if isinstance(o, dict):
                            for key in ("price", "lowPrice"):
                                if o.get(key) not in (None, ""):
                                    try: prices.append(float(str(o[key]).replace(",", ".")))
                                    except Exception: pass
                            cur = cur or o.get("priceCurrency")
                            if isinstance(o.get("offers"), list):
                                for oo in o["offers"]:
                                    if oo.get("price"): prices.append(float(str(oo["price"]).replace(",", ".")))
                    if x.get("name") and prices:
                        res.append({"name": str(x["name"]).strip()[:90], "price": min(prices), "from": len(set(prices)) > 1, "currency": cur})
    return res

def shop_site(c):
    base = c["url"]; o = urllib.parse.urlparse(base); origin = f"{o.scheme}://{o.netloc}"
    items = []
    # 1. WooCommerce public store API
    try:
        body, ct = get(origin + "/wp-json/wc/store/v1/products?per_page=100&search=matcha", accept="application/json")
        for p in json.loads(body):
            pr = p.get("prices", {})
            mi = int(pr.get("currency_minor_unit", 2) or 2)
            if p.get("name") and pr.get("price"):
                items.append({"name": html.unescape(p["name"])[:90], "price": int(pr["price"]) / (10 ** mi), "from": False, "currency": pr.get("currency_code"), "url": p.get("permalink")})
        if items: return items, "woocommerce"
    except Blocked: return [], "robots"
    except Exception: pass
    # 2. product pages found from the homepage / shop page (links that mention matcha), read for JSON-LD Product data
    pages, links = [], []
    for u in (base, origin + "/shop", origin + "/products", origin + "/shop/"):
        try:
            h, _ = get(u)
        except Blocked: return [], "robots"
        except urllib.error.HTTPError as e:
            if e.code in (403, 429): return [], f"http-{e.code}"
            continue
        except Exception: continue
        pages.append(h)
        for m in re.finditer(r'(?is)<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', h):
            href = urllib.parse.urljoin(u, html.unescape(m.group(1)))
            if urllib.parse.urlparse(href).netloc != o.netloc: continue
            if MATCHA.search(href) or MATCHA.search(re.sub(r"<[^>]+>", " ", m.group(2))):
                if re.search(r"/(product|products|shop|store|item|p)/", href, re.I) and href not in links: links.append(href.split("#")[0])
        items += [dict(i, url=u) for i in ld_products(h)]
        if len(links) >= 10: break
    for u in links[:10]:
        try: h, _ = get(u)
        except Blocked: return items, "robots"
        except urllib.error.HTTPError as e:
            if e.code in (403, 429): break
            continue
        except Exception: continue
        items += [dict(i, url=u) for i in ld_products(h)]
    seen, uniq = set(), []
    for i in items:
        if i["name"].lower() in seen or not MATCHA.search(i["name"]): continue
        seen.add(i["name"].lower()); uniq.append(i)
    return uniq, "jsonld" if uniq else "none"

def menu_site(c):
    urls = []
    for u in [c.get("menu")] + [e["u"] for e in c.get("ev", []) if e.get("k") == "menu"] + [e["u"] for e in c.get("ev", []) if e.get("k") == "home"] + [c.get("url")]:
        if u and u not in urls and not re.search(r"\.pdf($|\?)", u, re.I): urls.append(u)
    found = []
    for u in urls[:3]:
        try: h, ct = get(u)
        except Blocked: return found, "robots"
        except urllib.error.HTTPError as e:
            if e.code in (403, 429): return found, f"http-{e.code}"
            continue
        except Exception: continue
        L = text_lines(h)
        for i, l in enumerate(L):
            if not MATCHA.search(l) or JUNK.search(l) or len(l) > 140: continue
            cand = l
            if not PRICE_RE.search(cand) and i + 1 < len(L) and re.fullmatch(PRICE, L[i + 1].strip(), re.I): cand = l + " " + L[i + 1]
            pm = PRICE_RE.search(cand)
            if not pm: continue
            name = re.sub(r"\s+", " ", (cand[:pm.start()] + " " + cand[pm.end():])).strip(" .:-–—|·•,")
            name = PRICE_RE.sub("", name).strip(" .:-–—|·•,")
            if 3 <= len(name) <= 70 and MATCHA.search(name) and not JUNK.search(name):
                found.append({"name": name, "price": pm.group(0).strip(), "src": u, "line": cand[:140]})
        if len(found) >= 3: break
    seen, uniq = set(), []
    for f in found:
        k = f["name"].lower()
        if k in seen: continue
        seen.add(k); uniq.append(f)
    return uniq[:10], "ok" if uniq else "none"

for n, i in enumerate(ids, 1):
    c = cafes[i]
    try:
        items, st = (shop_site if mode == "shops" else menu_site)(c)
    except Exception as e:
        items, st = [], "error"
    out[i] = {"id": i, "name": c["name"], "url": c.get("url"), "status": st, "items": items}
    t.update(done=n, detail=f"{c['name'][:36]}: {st} ({len(items)})")
    json.dump(out, open(f"C:/temp/crawl_{mode}.json", "w", encoding="utf-8"), ensure_ascii=False)
from collections import Counter
t.finish(str(dict(Counter(v["status"] for v in out.values()))))
print(Counter(v["status"] for v in out.values()))
print("with items:", sum(1 for v in out.values() if v["items"]))
