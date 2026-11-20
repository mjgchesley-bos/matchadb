"""Builds public/data/shops.json for the Matcha map from data/stores.json: the places that sell packaged matcha to take home (retailers and brand shops,
kind "s") and the cafés a brand's own "where to buy" page lists that are not already on the café map (kind "b"). Cafés already in
public/data/cafes-slim-*.json (within 150 m) are left out so nothing shows twice. Run after changing data/stores.json:  python scripts/build-shops.py"""
import json, glob, math, os, re, unicodedata
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cafes = []
for f in glob.glob(os.path.join(ROOT, "public", "data", "cafes-slim-*.json")):
    cafes += json.load(open(f, encoding="utf-8"))
grid = defaultdict(list)
for c in cafes:
    grid[(round(c[6], 2), round(c[7], 2))].append(c)

def on_cafe_map(lat, lng, m=150):
    for dx in (-0.01, 0, 0.01):
        for dy in (-0.01, 0, 0.01):
            for c in grid.get((round(lat + dx, 2), round(lng + dy, 2)), []):
                if math.hypot((c[6] - lat) * 111000, (c[7] - lng) * 111000 * math.cos(math.radians(lat))) < m:
                    return True
    return False

def norm(t):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()).strip()
STOP = {"the", "cafe", "coffee", "tea", "matcha", "shop", "co", "and", "inside", "at"}

def café_twin(s, m=150):
    """The café-map row that is this same place (within 150 m and sharing a distinctive word of the name, not just the city), or None."""
    mine = set(norm(s["name"]).split()) - STOP - set(norm(s.get("city", "")).split())
    best = None
    for dx in (-0.01, 0, 0.01):
        for dy in (-0.01, 0, 0.01):
            for c in grid.get((round(s["lat"] + dx, 2), round(s["lng"] + dy, 2)), []):
                d = math.hypot((c[6] - s["lat"]) * 111000, (c[7] - s["lng"]) * 111000 * math.cos(math.radians(s["lat"])))
                if d >= m: continue
                theirs = set(norm(c[1]).split()) - STOP - set(norm(c[3]).split())
                if mine & theirs and (best is None or d < best[0]): best = (d, c[0])
    return best[1] if best else None

# A take-home shop (a brand's own shop or a retailer) that is already a café-map venue is that venue: one listing (the café's, with its reviews),
# and the brands the store carries are kept in public/data/cafe-brands.json so the map's brand filter and popup still find it.
twins, cafe_brands, cafe_aliases = set(), {}, {}
rows = []
for s in json.load(open(os.path.join(ROOT, "data", "stores.json"), encoding="utf-8")):
    if s["kind"] == "cafe":
        if on_cafe_map(s["lat"], s["lng"]): continue
        kind = "b"
    else:
        tw = café_twin(s)
        if tw:
            twins.add(tw); cafe_brands.setdefault(tw, []); cafe_aliases.setdefault(tw, []).append(s["name"])
            cafe_brands[tw] += [b["name"] for b in s.get("brands", []) if b["name"] not in cafe_brands[tw]]
            continue
        kind = "s"
    rows.append([s["id"], s["name"], s.get("address", ""), s.get("city", ""), s.get("state", ""), s.get("zip", ""), s["lat"], s["lng"], s.get("cc", "US"), kind, [b["name"] for b in s.get("brands", [])]])
json.dump(rows, open(os.path.join(ROOT, "public", "data", "shops.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(cafe_brands, open(os.path.join(ROOT, "public", "data", "cafe-brands.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(cafe_aliases, open(os.path.join(ROOT, "public", "data", "cafe-aliases.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))  # the merged stores' own names, so searches by them still find the café
print(len(twins), "stores merged into the café listing they duplicate")
print(len(rows), "places:", sum(1 for r in rows if r[9] == "s"), "to take home,", sum(1 for r in rows if r[9] == "b"), "brand-listed cafés")
