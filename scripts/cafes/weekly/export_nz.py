"""One-off pull of New Zealand places for the café map (the monthly scripts export_intl.py / export2.py / fsq_pull_all.py now include AU too).

Writes C:/temp/cafes/nz_cafes.parquet (Overture café categories), nz_ext.parquet (Overture extra food categories + anything with matcha in its name)
and fsq_nz_cafes.parquet (every café-type Foursquare venue). Same columns as the other place files, so build_all2.py reads them unchanged.
Usage: python -I export_au.py [overture-release] [fsq-release] [overture|fsq|both]
"""
import duckdb, sys, time

sys.stdout.reconfigure(encoding="utf-8")
REL = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else "2026-10-21.0"
FREL = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else "2026-10-15"
MODE = sys.argv[3] if len(sys.argv) > 3 else "both"      # overture | fsq | both
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';")
src = f"s3://overturemaps-us-west-2/release/{REL}/theme=places/type=place/*"
CAFE = "'coffee_shop','cafe','bubble_tea_shop','tea_room','coffee_roastery','hong_kong_style_cafe','cat_cafe','dog_cafe'"
EXTRA = "'dessert_shop','ice_cream_shop','smoothie_juice_bar','juice_bar','bakery','donut_shop','creperie','gelato_shop','food_truck_stand','patisserie_chocolatier','breakfast_and_brunch_restaurant','bagel_shop','health_food_restaurant','vegan_restaurant','japanese_restaurant','sandwich_shop','pastry_shop','chocolatier','confectionery'"
NAME = r"(?i)\bmatchas?\b|maccha|matcha|抹茶|まっちゃ|マッチャ|말차"
CAFEISH = r"(?i)caf[eé]|coffee|tea\b|espresso|boba|bakery|dessert|juice|kissa|喫茶|カフェ|珈琲|茶|카페|커피"
JUNK = "'lodging','package_locker','distribution_service','information_technology_company','contractor','art_gallery','bookstore','product_design','real_estate','school','college_university','hospital','church_cathedral','hotel','apartment','beauty_salon','hair_salon','spas','gym'"
t0 = time.time()
if MODE in ('overture', 'both'):
    con.execute(f"""
    COPY (
    SELECT id, names.primary AS name, taxonomy.primary AS cat, addresses[1].country AS cc,
           addresses[1].freeform AS address, addresses[1].locality AS city, addresses[1].region AS state, addresses[1].postcode AS zip,
           ST_Y(geometry) AS lat, ST_X(geometry) AS lng,
           websites[1] AS website, phones[1] AS phone,
           confidence, operating_status AS status, brand.names.primary AS brand, brand.wikidata AS brand_wikidata
    FROM read_parquet('{src}', hive_partitioning=1)
    WHERE addresses[1].country = 'NZ' AND taxonomy.primary IN ({CAFE})
      AND (operating_status IS NULL OR operating_status = 'open')
    ) TO 'C:/temp/cafes/nz_cafes.parquet' (FORMAT PARQUET);
    """)
    print("overture core", con.execute("SELECT count(*), count(website) FROM 'C:/temp/cafes/nz_cafes.parquet'").fetchall(), round(time.time() - t0), "s", flush=True)
    con.execute(f"""
    COPY (
    SELECT id, names.primary AS name, taxonomy.primary AS cat, addresses[1].country AS cc,
           addresses[1].freeform AS address, addresses[1].locality AS city, addresses[1].region AS state, addresses[1].postcode AS zip,
           ST_Y(geometry) AS lat, ST_X(geometry) AS lng, websites[1] AS website, socials AS socials, phones[1] AS phone,
           confidence, operating_status AS status, brand.names.primary AS brand, brand.wikidata AS brand_wikidata,
           regexp_matches(names.primary, '{NAME}') AS name_match
    FROM read_parquet('{src}', hive_partitioning=1)
    WHERE addresses[1].country = 'NZ'
      AND (operating_status IS NULL OR operating_status = 'open')
      AND names.primary IS NOT NULL
      AND (
            (regexp_matches(names.primary, '{NAME}') AND coalesce(taxonomy.primary,'') NOT IN ({JUNK}))
         OR (taxonomy.primary IN ({EXTRA}) AND taxonomy.primary NOT IN ({CAFE}))
         OR (taxonomy.primary IS NULL AND regexp_matches(names.primary, '{CAFEISH}'))
      )
    ) TO 'C:/temp/cafes/nz_ext.parquet' (FORMAT PARQUET);
    """)
    print("overture ext", con.execute("SELECT count(*), count(website), sum(name_match::int) FROM 'C:/temp/cafes/nz_ext.parquet'").fetchall(), round(time.time() - t0), "s", flush=True)


if MODE in ('fsq', 'both'):
    # Foursquare OS Places: every café-type venue in New Zealand (token in hf_token.txt, never printed)
    tok = open("C:/temp/cafes/hf_token.txt").read().strip()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(f"CREATE SECRET hf (TYPE HUGGINGFACE, TOKEN '{tok}')")
    fsrc = f"hf://datasets/foursquare/fsq-os-places/release/dt={FREL}/places/parquet/*.parquet"
    con.execute(f"""
    COPY (
      SELECT 'fsq' || fsq_place_id AS id, name,
        CASE
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%bubble tea%' THEN 'bubble_tea_shop'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%tea room%' THEN 'tea_room'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%coffee shop%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%coffee roaster%' THEN 'coffee_shop'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%cafe%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%café%' THEN 'cafe'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%ice cream%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%frozen yogurt%' THEN 'ice_cream_shop'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%dessert%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%gelato%' THEN 'dessert_shop'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%bakery%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%donut%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%bagel%' THEN 'bakery'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%juice%' OR array_to_string(fsq_category_labels, ' | ') ILIKE '%smoothie%' THEN 'juice_bar'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%breakfast%' THEN 'breakfast_and_brunch_restaurant'
          WHEN array_to_string(fsq_category_labels, ' | ') ILIKE '%creperie%' THEN 'creperie'
          ELSE 'cafe' END AS cat,
        country AS cc, address, locality AS city, coalesce(region, '') AS state, postcode AS zip,
        latitude AS lat, longitude AS lng, website,
        CASE WHEN instagram IS NOT NULL THEN [instagram] ELSE []::varchar[] END AS socials,
        tel AS phone, 0.6::double AS confidence, 'open' AS status, NULL::varchar AS brand, NULL::varchar AS brand_wikidata,
        regexp_matches(name, '(?i)matcha|maccha|抹茶|まっちゃ|マッチャ|말차') AS name_match
      FROM read_parquet('{fsrc}')
      WHERE date_closed IS NULL AND country = 'NZ' AND name IS NOT NULL
        AND list_aggregate(list_transform(fsq_category_labels, lambda x: CASE
              WHEN lower(x) LIKE '%coffee shop%' OR lower(x) LIKE '%> cafe%' OR lower(x) LIKE '%tea room%' OR lower(x) LIKE '%bubble tea%'
                OR lower(x) LIKE '%> tea%' OR lower(x) LIKE '%dessert shop%' OR lower(x) LIKE '%bakery%' OR lower(x) LIKE '%juice bar%'
                OR lower(x) LIKE '%smoothie%' OR lower(x) LIKE '%breakfast spot%' OR lower(x) LIKE '%café%' OR lower(x) LIKE '%coffee roaster%'
                OR lower(x) LIKE '%ice cream%' OR lower(x) LIKE '%donut%' OR lower(x) LIKE '%bagel%' OR lower(x) LIKE '%creperie%' THEN 1 ELSE 0 END), 'max') = 1
    ) TO 'C:/temp/cafes/fsq_nz_cafes.parquet' (FORMAT PARQUET)
    """)
    print("foursquare", con.execute("SELECT count(*), count(website), sum(name_match::int) FROM 'C:/temp/cafes/fsq_nz_cafes.parquet'").fetchall(), round(time.time() - t0), "s")
    print(con.execute("SELECT state, count(*) FROM 'C:/temp/cafes/nz_cafes.parquet' GROUP BY 1 ORDER BY 2 DESC LIMIT 12").fetchall())
