import duckdb, sys, re
sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
rows = con.execute("select * from 'C:/temp/cafes/fsq_matcha_names.parquet'").fetchall()
cols = [d[0] for d in con.execute("describe select * from 'C:/temp/cafes/fsq_matcha_names.parquet'").fetchall()]
R = [dict(zip(cols, r)) for r in rows]
NAME = re.compile(r"matcha|maccha|抹茶|まっちゃ|マッチャ|말차", re.I)

def cat_of(labels):
    s = " | ".join(labels or []).lower()
    top = (labels or [""])[0].lower()
    if not (top.startswith("dining and drinking") or "tea" in s or "food and beverage" in s or "bakery" in s):
        return "SKIP"
    if "bubble tea" in s: return "bubble_tea_shop"
    if "tea room" in s or "tea house" in s and "coffee" not in s: return "tea_room"
    if "coffee shop" in s: return "coffee_shop"
    if "cafe" in s: return "cafe"
    if "ice cream" in s or "frozen yogurt" in s: return "ice_cream_shop"
    if "dessert" in s or "gelato" in s or "candy" in s: return "dessert_shop"
    if "bakery" in s or "donut" in s: return "bakery"
    if "juice" in s or "smoothie" in s: return "juice_bar"
    if "japanese" in s: return "japanese_restaurant"
    if "bar" in s and "dessert" not in s: return "bar"
    if "restaurant" in s: return "restaurant"
    return None

out = []
for r in R:
    if not NAME.search(r["name"] or ""): continue
    c = cat_of(r["fsq_category_labels"])
    if c == "SKIP": continue
    out.append((
        "fsq" + r["fsq_place_id"], r["name"], c, r["country"], r["address"], r["locality"], r["region"] if r["country"] == "US" else (r["region"] or ""),
        r["postcode"], r["latitude"], r["longitude"], r["website"], [r["instagram"]] if r["instagram"] else [], r["tel"], 0.6, "open", None, None, True,
    ))
con.execute("""create table fsq (id varchar, name varchar, cat varchar, cc varchar, address varchar, city varchar, state varchar, zip varchar, lat double, lng double,
  website varchar, socials varchar[], phone varchar, confidence double, status varchar, brand varchar, brand_wikidata varchar, name_match boolean)""")
con.executemany("insert into fsq values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", out)
con.execute("copy fsq to 'C:/temp/cafes/fsq_cands.parquet' (format parquet)")
print(len(out), con.execute("select cc,count(*) from fsq group by 1 order by 2 desc limit 12").fetchall())
