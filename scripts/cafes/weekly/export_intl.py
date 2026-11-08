import duckdb
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;")
con.execute("SET s3_region='us-west-2';")
REL = "2026-10-21.0"
src = f"s3://overturemaps-us-west-2/release/{REL}/theme=places/type=place/*"
EU = "'GB','IE','FR','DE','IT','ES','PT','NL','BE','LU','AT','CH','SE','NO','DK','FI','IS','PL','CZ','SK','HU','GR','RO','BG','HR','SI','EE','LV','LT','MT','CY'"
cats = "('coffee_shop','cafe','bubble_tea_shop','tea_room','coffee_roastery','hong_kong_style_cafe','cat_cafe','dog_cafe')"
con.execute(f"""
COPY (
SELECT id, names.primary AS name, taxonomy.primary AS cat, addresses[1].country AS cc,
       addresses[1].freeform AS address, addresses[1].locality AS city, addresses[1].region AS state, addresses[1].postcode AS zip,
       ST_Y(geometry) AS lat, ST_X(geometry) AS lng,
       websites[1] AS website, phones[1] AS phone,
       confidence, operating_status AS status, brand.names.primary AS brand, brand.wikidata AS brand_wikidata
FROM read_parquet('{src}', hive_partitioning=1)
WHERE addresses[1].country IN ('CA','JP','KR',{EU}) AND taxonomy.primary IN {cats}
  AND (operating_status IS NULL OR operating_status = 'open')
) TO 'C:/temp/cafes/intl_cafes.parquet' (FORMAT PARQUET);
""")
print(con.execute("SELECT count(*), count(website) FROM 'C:/temp/cafes/intl_cafes.parquet'").fetchall())
for cc in ("JP", "KR", "CA", "GB", "DE"):
    print(cc, con.execute(f"SELECT name, city, state, zip, address FROM 'C:/temp/cafes/intl_cafes.parquet' WHERE cc='{cc}' AND website IS NOT NULL LIMIT 3").fetchall())
