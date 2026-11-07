import duckdb, json, re, sys
sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;")
con.execute("SET s3_region='us-west-2';")
src = "s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*"
rows = con.execute(f"""
SELECT names.primary, addresses[1].freeform, addresses[1].locality, addresses[1].postcode, ST_Y(geometry), ST_X(geometry), operating_status
FROM read_parquet('{src}', hive_partitioning=1)
WHERE addresses[1].country = 'CA' AND bbox.xmin BETWEEN -140 AND -52 AND bbox.ymin BETWEEN 41 AND 62
  AND (names.primary ILIKE '%davidstea%' OR names.primary ILIKE '%david''s tea%' OR names.primary ILIKE '%davids tea%')
""").fetchall()
print(len(rows), "Overture matches")
norm = lambda s: re.sub(r'\s+', '', (s or '').upper())
places = json.load(open("C:/temp/cafes/davids_places.json", encoding="utf-8"))
out, miss = [], []
for p in places:
    cand = [r for r in rows if norm(r[3]) == norm(p["postal"]) and norm(p["postal"])]
    if not cand and p["postal"]:
        cand = [r for r in rows if norm(r[3])[:3] == norm(p["postal"])[:3] and p["city"].lower()[:5] in (r[2] or "").lower()]
    if len(cand) >= 1:
        r = cand[0]
        p["lat"], p["lng"] = round(r[4], 6), round(r[5], 6)
        out.append(p)
    else:
        miss.append(p["name"])
print("with coordinates:", len(out), "missing:", miss)
json.dump(out, open("C:/temp/cafes/davids_places_geo.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
