"""Pull every open Foursquare OS Places café-type venue in the countries the map covers (not just ones with 'matcha' in the name).

Output: C:/temp/cafes/fsq_all_cafes.parquet. Needs the Hugging Face read token in C:/temp/cafes/hf_token.txt (never committed).
Usage: python -I fsq_pull_all.py [release-date]   e.g. 2026-10-15 (default: newest the script can find)
"""
import duckdb, sys, time

sys.stdout.reconfigure(encoding="utf-8")
rel = sys.argv[1] if len(sys.argv) > 1 else "2026-10-15"
t = open("C:/temp/cafes/hf_token.txt").read().strip()
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs;")
con.execute(f"CREATE SECRET hf (TYPE HUGGINGFACE, TOKEN '{t}')")
src = f"hf://datasets/foursquare/fsq-os-places/release/dt={rel}/places/parquet/*.parquet"
CC = "'US','CA','JP','KR','GB','IE','FR','DE','IT','ES','PT','NL','BE','LU','AT','CH','SE','NO','DK','FI','IS','PL','CZ','SK','HU','GR','RO','BG','HR','SI','EE','LV','LT','MT','CY'"
t0 = time.time()
con.execute(f"""
COPY (
  SELECT fsq_place_id, name, latitude, longitude, address, locality, region, postcode, country,
         tel, website, instagram, facebook_id, fsq_category_labels, date_created, date_refreshed
  FROM read_parquet('{src}')
  WHERE date_closed IS NULL AND country IN ({CC}) AND name IS NOT NULL
    AND list_aggregate(list_transform(fsq_category_labels, lambda x: CASE
          WHEN lower(x) LIKE '%coffee shop%' OR lower(x) LIKE '%> cafe%' OR lower(x) LIKE '%tea room%' OR lower(x) LIKE '%bubble tea%'
            OR lower(x) LIKE '%> tea%' OR lower(x) LIKE '%dessert shop%' OR lower(x) LIKE '%bakery%' OR lower(x) LIKE '%juice bar%'
            OR lower(x) LIKE '%smoothie%' OR lower(x) LIKE '%breakfast spot%' OR lower(x) LIKE '%café%' OR lower(x) LIKE '%coffee roaster%'
            OR lower(x) LIKE '%ice cream%' OR lower(x) LIKE '%donut%' OR lower(x) LIKE '%bagel%' OR lower(x) LIKE '%creperie%' THEN 1 ELSE 0 END), 'max') = 1
) TO 'C:/temp/cafes/fsq_all_cafes.parquet' (FORMAT PARQUET)
""")
print("done", round(time.time() - t0), "s")
print(con.execute("select country, count(*), count(website) from 'C:/temp/cafes/fsq_all_cafes.parquet' group by 1 order by 2 desc limit 12").fetchall())
