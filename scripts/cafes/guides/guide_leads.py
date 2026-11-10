"""Read public "best matcha in <city>" guides and pull out the café names they mention, as LEADS ONLY.

A lead is never listed on its own: each one is later matched against our data and, if it is new, checked on the café's own menu.
Honest user agent, robots.txt honoured, one request per second per host, pages cached on disk.
usage: python -I guide_leads.py   ->  guides/leads_raw.json
"""
import hashlib, json, os, re, sys, time, urllib.parse, urllib.request, urllib.robotparser
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = f"{HERE}/cache"
os.makedirs(CACHE, exist_ok=True)
UA = "Mozilla/5.0 (compatible; MatchaDBBot/1.0; +https://www.matchadb.com)"

urls = {}
for f in ("urls_part1.json", "urls_part2.json", "urls_extra.json"):
    p = f"{HERE}/{f}"
    if os.path.exists(p):
        urls.update(json.load(open(p, encoding="utf-8")))

robots, last = {}, {}


def allowed(u):
    o = urllib.parse.urlparse(u)
    key = f"{o.scheme}://{o.netloc}"
    rp = robots.get(key)
    if rp is None:
        rp = urllib.robotparser.RobotFileParser()
        try:
            body = urllib.request.urlopen(urllib.request.Request(key + "/robots.txt", headers={"User-Agent": UA}), timeout=8).read().decode("utf-8", "ignore")
            rp.parse(body.splitlines())
        except Exception:
            rp.parse([])
        robots[key] = rp
    return rp.can_fetch("MatchaDBBot", u)


def fetch(u):
    fp = f"{CACHE}/{hashlib.md5(u.encode()).hexdigest()}.html"
    if os.path.exists(fp):
        return open(fp, encoding="utf-8").read(), "cache"
    if not allowed(u):
        return None, "robots"
    host = urllib.parse.urlparse(u).netloc
    wait = last.get(host, 0) + 1.0 - time.time()
    if wait > 0:
        time.sleep(wait)
    last[host] = time.time()
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA, "Accept-Language": "en"}), timeout=25).read()
        html = raw.decode("utf-8", "ignore")
    except Exception as e:
        return None, "fail:" + type(e).__name__
    open(fp, "w", encoding="utf-8").write(html)
    return html, "ok"


STOP = re.compile(r"^(final|conclusion|related|faq|table of|share|comment|leave a|subscribe|sign up|newsletter|about|contact|menu|home|search|more|read|see|map|where|how|why|what|best|top|tips|notes?|summary|introduction|intro|update|disclosure|photos?|credit|advertis|sponsor|trending|recent|popular|follow|join|click|get|find|our|my|your|the best|the top|honorable|other|also|bonus|pin|print|jump|skip|categories|tags|archives?|privacy|terms|cookie|©)", re.I)
BAD = re.compile(r"\b(matcha|latte|lattes|guide|ranked|spots|places|shops|cafes|cafés|coffee shops|near me|in (the )?[a-z .]+$)\b", re.I)


def clean(name):
    n = re.sub(r"\s+", " ", name).strip()
    n = re.sub(r"^[\W_]*(?:#?\d{1,2}[\).:\-–]*|[•*▪▸►→✨⭐️🍵])\s*", "", n)            # leading numbering / bullets
    n = re.split(r"\s+[–—|\-]\s+|\s*:\s|\s+\(|\s*\|\s*", n)[0]                       # keep the part before a dash, colon, bracket
    n = n.strip(" .:;,'\"“”‘’*")
    return n


def good(n):
    if not (2 <= len(n) <= 48) or len(n.split()) > 6:
        return False
    if STOP.match(n):
        return False
    if re.search(r"[a-z]{2}", n, re.I) is None:
        return False
    if len(n.split()) >= 4 and BAD.search(n):
        return False
    return True


SKIP_HOST = re.compile(r"(instagram|facebook|tiktok|twitter|x\.com|youtube|pinterest|google\.|goo\.gl|maps\.|yelp|tripadvisor|eater\.com|apple\.com|bing\.|wikipedia|linkedin|substack|wordpress|squarespace\.com|shopify\.com|doordash|ubereats|grubhub|opentable|resy\.com|toasttab|reddit|mailto|tel:)", re.I)


def links_in(nodes, own):
    out = []
    for n in nodes:
        if not hasattr(n, "find_all"):
            continue
        for a in ([n] if n.name == "a" else []) + n.find_all("a", href=True):
            h = a.get("href", "")
            if not h.startswith("http"):
                continue
            host = urllib.parse.urlparse(h).netloc.lower()
            if own in host or SKIP_HOST.search(host):
                continue
            out.append([re.sub(r"\s+", " ", a.get_text(" ")).strip()[:50], h.split("?")[0]])
    return out


def extract(html, own=""):
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "nav", "footer", "header", "form", "noscript", "aside"]):
        t.decompose()
    out = []
    heads = soup.find_all(["h2", "h3", "h4"])
    for h in heads:
        name = clean(h.get_text(" "))
        # section text = everything until the next heading
        txt, nodes = [], [h]
        for sib in h.next_siblings:
            if getattr(sib, "name", None) in ("h1", "h2", "h3", "h4"):
                break
            txt.append(sib.get_text(" ") if hasattr(sib, "get_text") else str(sib))
            nodes.append(sib)
            if sum(len(x) for x in txt) > 1500:
                break
        ctx = re.sub(r"\s+", " ", " ".join(txt)).strip()
        if good(name):
            out.append((name, ctx, "heading", links_in(nodes, own)[:8]))
    for el in soup.find_all(["p", "li"]):
        b = el.find(["strong", "b"])
        if not b:
            continue
        full = re.sub(r"\s+", " ", el.get_text(" ")).strip()
        bt = re.sub(r"\s+", " ", b.get_text(" ")).strip()
        if not full.startswith(bt[:12]) and not re.match(r"^[\W\d]*" + re.escape(bt[:10]), full):
            continue                                                                   # bold must open the item
        name = clean(bt)
        if good(name):
            out.append((name, full, "bold", links_in([el], own)[:6]))
    return out


leads, report = [], []
for key, us in urls.items():
    city, st = key.split("|")
    for u in us:
        html, how = fetch(u)
        if not html:
            report.append((city, u, how, 0))
            continue
        n = 0
        for name, ctx, kind, lk in extract(html, urllib.parse.urlparse(u).netloc.lower().replace("www.", "")):
            if not re.search(r"matcha|maccha|抹茶", ctx, re.I):
                continue
            leads.append({"metro": city, "state": st, "name": name, "src": u, "kind": kind, "ctx": ctx[:300], "links": lk})
            n += 1
        report.append((city, u, how, n))
        print(f"{city:15} {n:3} {how:6} {u[:90]}", flush=True)

json.dump(leads, open(f"{HERE}/leads_raw.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("leads", len(leads), "from", len(report), "pages;", sum(1 for r in report if not str(r[2]).startswith(("ok", "cache"))), "pages not read")
