import duckdb, json
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;")
con.execute("SET s3_region='us-west-2';")
REL = "2026-10-21.0"
src = f"s3://overturemaps-us-west-2/release/{REL}/theme=places/type=place/*"
con.execute(f"""
COPY (
SELECT id, names.primary AS name, taxonomy.primary AS cat,
       addresses[1].freeform AS address, addresses[1].locality AS city, addresses[1].region AS state, addresses[1].postcode AS zip,
       ST_Y(geometry) AS lat, ST_X(geometry) AS lng,
       websites[1] AS website, socials AS socials, phones[1] AS phone,
       confidence, operating_status AS status, brand.names.primary AS brand, brand.wikidata AS brand_wikidata
FROM read_parquet('{src}', hive_partitioning=1)
WHERE addresses[1].country='US'
  AND taxonomy.primary IN ('coffee_shop','cafe','bubble_tea_shop','tea_room','coffee_roastery','hong_kong_style_cafe','cat_cafe','dog_cafe','internet_cafe')
  AND (operating_status IS NULL OR operating_status = 'open')
) TO 'C:/temp/cafes/us_cafes.parquet' (FORMAT PARQUET);
""")
print(con.execute("SELECT count(*), count(website), count(DISTINCT regexp_extract(website,'https?://(?:www\\.)?([^/]+)',1)) FROM 'C:/temp/cafes/us_cafes.parquet'").fetchall())
print(con.execute("SELECT state, count(*) c FROM 'C:/temp/cafes/us_cafes.parquet' GROUP BY 1 ORDER BY 2 DESC LIMIT 8").fetchall())
print(con.execute("SELECT brand, count(*) c FROM 'C:/temp/cafes/us_cafes.parquet' WHERE brand IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 15").fetchall())
print(con.execute("SELECT count(*) FROM 'C:/temp/cafes/us_cafes.parquet' WHERE name ILIKE '%matcha%'").fetchall())
