import duckdb, sys, time
sys.stdout.reconfigure(encoding="utf-8")
t = open("C:/temp/cafes/hf_token.txt").read().strip()
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs;")
con.execute(f"CREATE SECRET hf (TYPE HUGGINGFACE, TOKEN '{t}')")
src = "hf://datasets/foursquare/fsq-os-places/release/dt=2026-10-15/places/parquet/*.parquet"
t0 = time.time()
con.execute(f"""
COPY (
  SELECT fsq_place_id, name, latitude, longitude, address, locality, region, postcode, country,
         tel, website, instagram, fsq_category_labels, date_created, date_refreshed
  FROM read_parquet('{src}')
  WHERE date_closed IS NULL
    AND (name ILIKE '%matcha%' OR name ILIKE '%maccha%' OR name LIKE '%抹茶%' OR name LIKE '%말차%' OR name LIKE '%マッチャ%' OR name LIKE '%茶寮%' OR name ILIKE '%matcha%')
) TO 'C:/temp/cafes/fsq_matcha_names.parquet' (FORMAT PARQUET)
""")
print("done", round(time.time() - t0), "s")
n = con.execute("select count(*) from 'C:/temp/cafes/fsq_matcha_names.parquet'").fetchone()
print(n)
