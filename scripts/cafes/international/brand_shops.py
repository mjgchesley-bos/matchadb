import duckdb, json, re, sqlite3, sys
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding="utf-8")
db = sqlite3.connect("C:/Users/mjgch/projects/matchadb/data/matcha.db")
rows = db.execute("select b.name, p.source_url from products p join brands b on p.brand_id=b.id where p.source_url is not null").fetchall()
SKIP = re.compile(r'(amazon|ebay|etsy|walmart|target\.com|costco|iherb|rakuten|yahoo|shopee|lazada|wholefoods|instacart|kroger|sprouts)', re.I)
dom = {}
for name, url in rows:
    try: h = urlparse(url).netloc.lower()
    except Exception: continue
    h = re.sub(r'^www\.', '', h)
    if not h or SKIP.search(h): continue
    dom.setdefault(h, set()).add(name)
print(len(dom), "brand domains")
hostbrand = {h: sorted(b)[0] for h, b in dom.items() if len(b) == 1}
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;")
con.execute("SET s3_region='us-west-2';")
src = "s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*"
EU = "'GB','IE','FR','DE','IT','ES','PT','NL','BE','LU','AT','CH','SE','NO','DK','FI','IS','PL','CZ','SK','HU','GR','RO','BG','HR','SI','EE','LV','LT','MT','CY'"
con.register("hb", __import__("pandas").DataFrame({"host": list(hostbrand), "brand": list(hostbrand.values())})) if False else None
hosts_sql = ",".join("'" + h.replace("'", "") + "'" for h in hostbrand)
res = con.execute(f"""
SELECT names.primary, taxonomy.primary, addresses[1].country, addresses[1].freeform, addresses[1].locality, addresses[1].postcode,
       ST_Y(geometry), ST_X(geometry), websites[1],
       regexp_replace(regexp_extract(websites[1], '^(?:https?://)?([^/]+)', 1), '^www\\.', '') AS host, operating_status, confidence
FROM read_parquet('{src}', hive_partitioning=1)
WHERE addresses[1].country IN ('CA','JP','KR',{EU}) AND websites[1] IS NOT NULL
  AND regexp_replace(regexp_extract(websites[1], '^(?:https?://)?([^/]+)', 1), '^www\\.', '') IN ({hosts_sql})
  AND (operating_status IS NULL OR operating_status = 'open')
""").fetchall()
print(len(res), "places on brand domains")
out = []
for r in res:
    out.append({"name": r[0], "cat": r[1], "cc": r[2], "address": r[3], "city": r[4], "zip": r[5], "lat": round(r[6], 6), "lng": round(r[7], 6), "url": r[8], "host": r[9], "brand": hostbrand[r[9]], "conf": r[11]})
from collections import Counter
print(Counter((o["brand"], o["cc"]) for o in out).most_common(40))
json.dump(out, open("C:/temp/cafes/brand_shops.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for o in out[:25]: print(o["brand"], "|", o["name"], "|", o["cc"], o["city"], "|", o["url"][:70])
