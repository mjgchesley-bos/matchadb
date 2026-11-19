"""Builds public/data/shops.json for the Matcha map from data/stores.json: the places that sell packaged matcha to take home (retailers and brand shops,
kind "s") and the cafés a brand's own "where to buy" page lists that are not already on the café map (kind "b"). Cafés already in
public/data/cafes-slim-*.json (within 150 m) are left out so nothing shows twice. Run after changing data/stores.json:  python scripts/build-shops.py"""
import json, glob, math, os
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

rows = []
for s in json.load(open(os.path.join(ROOT, "data", "stores.json"), encoding="utf-8")):
    if s["kind"] == "cafe":
        if on_cafe_map(s["lat"], s["lng"]): continue
        kind = "b"
    else:
        kind = "s"
    rows.append([s["id"], s["name"], s.get("address", ""), s.get("city", ""), s.get("state", ""), s.get("zip", ""), s["lat"], s["lng"], s.get("cc", "US"), kind, [b["name"] for b in s.get("brands", [])]])
json.dump(rows, open(os.path.join(ROOT, "public", "data", "shops.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(rows), "places:", sum(1 for r in rows if r[9] == "s"), "to take home,", sum(1 for r in rows if r[9] == "b"), "brand-listed cafés")
