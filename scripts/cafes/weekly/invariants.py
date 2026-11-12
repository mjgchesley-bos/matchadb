"""Permanent map invariants (imported by weekly_refresh.build_and_verify). Each returns a list of problem strings."""
import collections, re, unicodedata
from urllib.parse import urlparse

def _tok(n):
    n = unicodedata.normalize("NFKD", n.lower()).encode("ascii", "ignore").decode()
    return {t for t in re.findall(r"[a-z]{4,}", n) if t not in ("coffee", "cafe", "caffe", "bakery", "tea", "house", "shop", "store", "restaurant", "roasters", "roasting", "company", "kitchen", "bistro", "matcha", "the")}

def _host(u):
    try: return urlparse(u if u.startswith("http") else "http://" + u).netloc.lower().replace("www.", "")
    except Exception: return ""

def shared_evidence(cafes):
    """LESSON 2026-11-12 (scraped directories / multi-tenant hosts): one page's matcha text must never be the evidence for 3+ UNRELATED venues."""
    by = collections.defaultdict(list)
    for c in cafes:
        if c.get("ev") and not c.get("via"): by[c["ev"][0]["u"]].append(c)
    bad = []
    for u, v in by.items():
        if len(v) < 3: continue
        parent = list(range(len(v)))
        def f(x):
            while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
            return x
        toks = [_tok(c["name"]) for c in v]; hosts = [_host(c.get("url") or "") for c in v]
        for i in range(len(v)):
            for j in range(i + 1, len(v)):
                if (toks[i] & toks[j]) or (hosts[i] and hosts[i] == hosts[j]) or v[i]["name"].lower()[:6] == v[j]["name"].lower()[:6]: parent[f(i)] = f(j)
        if len({f(i) for i in range(len(v))}) >= 3: bad.append((u, [c["name"] for c in v][:3], len(v)))
    return bad

ADDR_BAD = re.compile(r"[${}<>^`]|\bundefined\b|\bnull\b|\bnan\b", re.I)
def address_sanity(cafes):
    """LESSON 2026-11-12 ("3701$ Guadalupe Street" came through from a source record): addresses must not carry junk characters."""
    return [(c["id"], c["name"], c["address"]) for c in cafes if c.get("address") and ADDR_BAD.search(c["address"])]

def regression(cafes, cases):
    """Hand-reviewed bad cases must never come back (matched by name fragment + city fragment, or by website host)."""
    probs = []
    for x in cases.get("must_exclude", []):
        for c in cafes:
            if "name" in x and x["name"].lower() in c["name"].lower() and (not x.get("city") or x["city"].lower() in (c.get("city") or "").lower()): probs.append(f"back on the map: {c['name']} ({c.get('city')}) - {x.get('why','')}")
            elif "host" in x and _host(c.get("url") or "") == x["host"]: probs.append(f"back on the map via host {x['host']}: {c['name']}")
    return probs
