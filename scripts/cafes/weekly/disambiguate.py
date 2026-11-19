"""Multi-location names get their place in parentheses: "La La Land (Burnet)", "La La Land (South Congress)".
Rule, per venue within a group of venues that share a name: use the city/town name when that is unique inside the group; when two or more are in the
same city, use the street name instead (directions spelled out, house number and street type dropped); if streets also collide, use the full street address.
Names that already carry a parenthesis, or that already contain the label, are left alone. Input names must be the raw ones (the build output), so this is idempotent.
Usage: python disambiguate.py <dir with data/cafes json> <dir with cafes-slim json>   (rewrites both in place)"""
import json, re, sys, glob, unicodedata, collections

DIR = {"n": "North", "s": "South", "e": "East", "w": "West", "ne": "Northeast", "nw": "Northwest", "se": "Southeast", "sw": "Southwest"}
TYPES = {"st", "street", "ave", "avenue", "av", "rd", "road", "blvd", "boulevard", "dr", "drive", "ln", "lane", "pkwy", "parkway", "hwy", "highway", "ct", "court", "pl", "place", "cir", "circle", "ter", "terrace", "way", "trl", "trail", "sq", "square", "plz", "plaza", "expy"}
UNIT = re.compile(r"\b(ste|suite|unit|apt|apartment|fl|floor|bldg|building|space|spc|room|rm|lot)\b\.?\s*#?\s*\w+.*$|#\s*\w+.*$", re.I)

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def street(addr):
    a = (addr or "").split(",")[0]
    a = UNIT.sub("", a).strip()
    toks = [t for t in re.split(r"\s+", a) if t]
    toks = [t for t in toks if not re.fullmatch(r"\d+[a-zA-Z]?([-/]\d+[a-zA-Z]?)?", t)]
    out = []
    for i, t in enumerate(toks):
        k = t.lower().strip(".")
        if i == 0 and k in DIR and len(toks) > 1:
            out.append(DIR[k]); continue
        out.append(t)
    while len(out) > 1 and out[-1].lower().strip(".") in TYPES:
        out.pop()
    # a directional that trails ("Congress Ave S") reads better dropped
    if len(out) > 1 and out[-1].lower().strip(".") in DIR: out.pop()
    s = " ".join(out).strip(" .-")
    return s if len(s) >= 3 and not s.isdigit() and ok(s) else ""

def ok(s):
    """A usable label: readable Latin text (no broken characters, not just a block number like 1-25-12)."""
    return bool(s) and "�" not in s and "?" not in s and re.search(r"[A-Za-z]{3,}", s) is not None and len(s) <= 45

def full_addr(addr):
    a = UNIT.sub("", (addr or "").split(",")[0]).strip()
    return a if ok(a) else ""

def labels(members):
    """members: list of dicts with id, city, address, cc. Returns {id: label}."""
    out = {}
    by_city = collections.defaultdict(list)
    for m in members:
        by_city[norm(m["city"]) or "?"].append(m)
    for city, ms in by_city.items():
        if len(ms) == 1:
            c = (ms[0]["city"] or "").strip()
            out[ms[0]["id"]] = c if c and "�" not in c else (street(ms[0]["address"]) or full_addr(ms[0]["address"]))
            continue
        strs = collections.Counter(norm(street(m["address"])) for m in ms)
        for m in ms:
            st = street(m["address"])
            if st and strs[norm(st)] == 1: out[m["id"]] = st
            else: out[m["id"]] = full_addr(m["address"]) or st or ""
    # if a city label collides across countries/states with another group member, qualify it
    seen = collections.Counter(norm(v) for v in out.values())
    for m in members:
        v = out[m["id"]]
        if v and seen[norm(v)] > 1:
            extra = (m.get("state") or m.get("cc") or "").strip()
            if extra and extra.lower() not in v.lower(): out[m["id"]] = f"{v}, {extra}"
    return out

def apply(d_dir, p_dir):
    files = sorted(glob.glob(f"{d_dir}/*.json"))
    data = {f: json.load(open(f, encoding="utf-8")) for f in files}
    groups = collections.defaultdict(list)
    for f, rows in data.items():
        for c in rows:
            if "(" in c["name"]: continue
            groups[norm(c["name"])].append(c)
    new = {}
    n_groups = 0
    for key, ms in groups.items():
        if len(ms) < 2 or not key: continue
        n_groups += 1
        lab = labels(ms)
        for c in ms:
            l = lab[c["id"]]
            if not l or norm(l) in norm(c["name"]): continue
            new[c["id"]] = f"{c['name']} ({l})"
    for f, rows in data.items():
        changed = False
        for c in rows:
            if c["id"] in new:
                c["name"] = new[c["id"]]; changed = True
        if changed: json.dump(rows, open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for f in glob.glob(f"{p_dir}/cafes-slim-*.json"):
        rows = json.load(open(f, encoding="utf-8"))
        ch = False
        for r in rows:
            if r[0] in new: r[1] = new[r[0]]; ch = True
        if ch: json.dump(rows, open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return len(new), n_groups, new

if __name__ == "__main__":
    n, g, new = apply(sys.argv[1], sys.argv[2])
    print(f"{n} venues renamed across {g} multi-location names")
