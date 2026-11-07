import duckdb, sys
sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;")
con.execute("SET s3_region='us-west-2';")
REL = "2026-10-21.0"
src = f"s3://overturemaps-us-west-2/release/{REL}/theme=places/type=place/*"
EU = "'GB','IE','FR','DE','IT','ES','PT','NL','BE','LU','AT','CH','SE','NO','DK','FI','IS','PL','CZ','SK','HU','GR','RO','BG','HR','SI','EE','LV','LT','MT','CY'"
cats = ("'coffee_and_tea_supplies','tea_wholesaler','specialty_foods_store','health_food_store','organic_grocery_store','japanese_grocery_store','asian_grocery_store',"
        "'korean_grocery_store','international_grocery_store','japanese_confectionery_shop','tea_room','ethical_grocery_store'")
con.execute(f"""
COPY (
SELECT id, names.primary AS name, taxonomy.primary AS cat, addresses[1].country AS cc,
       addresses[1].freeform AS address, addresses[1].locality AS city, addresses[1].region AS state, addresses[1].postcode AS zip,
       ST_Y(geometry) AS lat, ST_X(geometry) AS lng, websites[1] AS website, phones[1] AS phone, confidence,
       brand.names.primary AS brand, brand.wikidata AS brand_wikidata
FROM read_parquet('{src}', hive_partitioning=1)
WHERE addresses[1].country IN ('CA','JP','KR',{EU}) AND taxonomy.primary IN ({cats})
  AND (operating_status IS NULL OR operating_status = 'open') AND websites[1] IS NOT NULL
) TO 'C:/temp/cafes/intl_stores.parquet' (FORMAT PARQUET);
""")
print(con.execute("SELECT cat, count(*) FROM 'C:/temp/cafes/intl_stores.parquet' GROUP BY 1 ORDER BY 2 DESC").fetchall())
print(con.execute("SELECT cc, count(*) FROM 'C:/temp/cafes/intl_stores.parquet' GROUP BY 1 ORDER BY 2 DESC LIMIT 10").fetchall())
print(con.execute("SELECT count(*) FROM 'C:/temp/cafes/intl_stores.parquet'").fetchall())
