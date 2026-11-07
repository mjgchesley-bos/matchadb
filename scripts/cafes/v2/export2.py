"""Extended candidate set: places Overture lists that our first export never looked at.
 - extra food/drink categories (dessert, juice bar, brunch, ice cream, bakery...) and uncategorised cafe-like names
 - ANY place whose own name says matcha (the name is the claim), minus obviously unrelated categories
"""
import duckdb, sys
sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';")
src = "s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*"
EU = "'GB','IE','FR','DE','IT','ES','PT','NL','BE','LU','AT','CH','SE','NO','DK','FI','IS','PL','CZ','SK','HU','GR','RO','BG','HR','SI','EE','LV','LT','MT','CY'"
CAFE = "'coffee_shop','cafe','bubble_tea_shop','tea_room','coffee_roastery','hong_kong_style_cafe','cat_cafe','dog_cafe','internet_cafe'"
EXTRA = "'dessert_shop','ice_cream_shop','smoothie_juice_bar','juice_bar','bakery','donut_shop','creperie','gelato_shop','food_truck_stand','patisserie_chocolatier','breakfast_and_brunch_restaurant','bagel_shop','health_food_restaurant','vegan_restaurant','japanese_restaurant','sandwich_shop','pastry_shop','chocolatier','confectionery'"
NAME = r"(?i)\bmatchas?\b|maccha|matcha|抹茶|まっちゃ|マッチャ|말차"
CAFEISH = r"(?i)caf[eé]|coffee|tea\b|espresso|boba|bakery|dessert|juice|kissa|喫茶|カフェ|珈琲|茶|카페|커피"
JUNK = "'lodging','package_locker','distribution_service','information_technology_company','contractor','art_gallery','bookstore','product_design','real_estate','school','college_university','hospital','church_cathedral','hotel','apartment','beauty_salon','hair_salon','spas','gym'"
con.execute(f"""
COPY (
SELECT id, names.primary AS name, taxonomy.primary AS cat, addresses[1].country AS cc,
       addresses[1].freeform AS address, addresses[1].locality AS city, addresses[1].region AS state, addresses[1].postcode AS zip,
       ST_Y(geometry) AS lat, ST_X(geometry) AS lng, websites[1] AS website, socials AS socials, phones[1] AS phone,
       confidence, operating_status AS status, brand.names.primary AS brand, brand.wikidata AS brand_wikidata,
       regexp_matches(names.primary, '{NAME}') AS name_match
FROM read_parquet('{src}', hive_partitioning=1)
WHERE addresses[1].country IN ('US','CA','JP','KR',{EU})
  AND (operating_status IS NULL OR operating_status = 'open')
  AND names.primary IS NOT NULL
  AND (
        (regexp_matches(names.primary, '{NAME}') AND coalesce(taxonomy.primary,'') NOT IN ({JUNK}))
     OR (taxonomy.primary IN ({EXTRA}) AND taxonomy.primary NOT IN ({CAFE}))
     OR (taxonomy.primary IS NULL AND regexp_matches(names.primary, '{CAFEISH}'))
  )
) TO 'C:/temp/cafes/ext_cands.parquet' (FORMAT PARQUET);
""")
print(con.execute("select count(*), count(website), sum(name_match::int) from 'C:/temp/cafes/ext_cands.parquet'").fetchall())
print(con.execute("select cc,count(*) from 'C:/temp/cafes/ext_cands.parquet' group by 1 order by 2 desc limit 8").fetchall())
print(con.execute("select cat,count(*),sum(name_match::int) from 'C:/temp/cafes/ext_cands.parquet' group by 1 order by 2 desc limit 25").fetchall())
