"""Turn fsq_all_cafes.parquet (every café-type Foursquare venue in the covered countries) into candidate rows for build_all2.py.

Output: C:/temp/cafes/fsq_all_cands.parquet, same columns as the other place files. confidence 0.6; name_match marks 'matcha' in the name.
Pure SQL so it runs in seconds on millions of rows.
"""
import duckdb, sys

sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
con.execute("""
copy (
  select 'fsq' || fsq_place_id as id, name,
    case
      when array_to_string(fsq_category_labels, ' | ') ilike '%bubble tea%' then 'bubble_tea_shop'
      when array_to_string(fsq_category_labels, ' | ') ilike '%tea room%' then 'tea_room'
      when array_to_string(fsq_category_labels, ' | ') ilike '%coffee shop%' or array_to_string(fsq_category_labels, ' | ') ilike '%coffee roaster%' then 'coffee_shop'
      when array_to_string(fsq_category_labels, ' | ') ilike '%cafe%' or array_to_string(fsq_category_labels, ' | ') ilike '%café%' then 'cafe'
      when array_to_string(fsq_category_labels, ' | ') ilike '%ice cream%' or array_to_string(fsq_category_labels, ' | ') ilike '%frozen yogurt%' then 'ice_cream_shop'
      when array_to_string(fsq_category_labels, ' | ') ilike '%dessert%' or array_to_string(fsq_category_labels, ' | ') ilike '%gelato%' then 'dessert_shop'
      when array_to_string(fsq_category_labels, ' | ') ilike '%bakery%' or array_to_string(fsq_category_labels, ' | ') ilike '%donut%' or array_to_string(fsq_category_labels, ' | ') ilike '%bagel%' then 'bakery'
      when array_to_string(fsq_category_labels, ' | ') ilike '%juice%' or array_to_string(fsq_category_labels, ' | ') ilike '%smoothie%' then 'juice_bar'
      when array_to_string(fsq_category_labels, ' | ') ilike '%breakfast%' then 'breakfast_and_brunch_restaurant'
      when array_to_string(fsq_category_labels, ' | ') ilike '%creperie%' then 'creperie'
      else 'cafe' end as cat,
    country as cc, address, locality as city, coalesce(region, '') as state, postcode as zip,
    latitude as lat, longitude as lng, website,
    case when instagram is not null then [instagram] else []::varchar[] end as socials,
    tel as phone, 0.6::double as confidence, 'open' as status, null::varchar as brand, null::varchar as brand_wikidata,
    regexp_matches(name, '(?i)matcha|maccha|抹茶|まっちゃ|マッチャ|말차') as name_match
  from 'C:/temp/cafes/fsq_all_cafes.parquet'
) to 'C:/temp/cafes/fsq_all_cands.parquet' (format parquet)
""")
print(con.execute("select count(*), count(website), sum(name_match::int) from 'C:/temp/cafes/fsq_all_cands.parquet'").fetchall())
