import duckdb, json, re, sys
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
rows = con.execute("SELECT id, cc, website, brand_wikidata FROM 'C:/temp/cafes/intl_stores.parquet' WHERE website IS NOT NULL").fetchall()
THIRD = re.compile(r'(facebook|instagram|yelp|tripadvisor|google|goo\.gl|linktr\.ee|twitter|x\.com|tiktok|doordash|ubereats|grubhub|opentable|foursquare|mapquest|yellowpages|'
                   r'tabelog|hotpepper|gnavi|retty|ameblo|line\.me|lin\.ee|rakuten|jalan|ikyu|navitime|mapion|wolt|deliveroo|just-eat|justeat|lieferando|thefork|booking|restaurantguru|'
                   r'naver|kakao|daum|tistory|youtube|pinterest|linkedin|business\.site|page\.link|bit\.ly|menupix|zomato|cylex|pagesjaunes|yell\.com|amazon\.|ebay\.|etsy\.)', re.I)
def host_of(u):
    try:
        h = urlparse(u if re.match(r'https?://', u) else 'http://' + u).netloc.lower()
    except Exception:
        return None
    return re.sub(r'^www\.', '', h) or None
by_host = {}
for id_, cc, web, wd in rows:
    h = host_of(web)
    if h: by_host.setdefault(h, []).append((cc, web, wd))
hosts, chains = [], 0
for h, recs in by_host.items():
    if THIRD.search(h): continue
    if len(recs) >= 25: chains += 1; continue
    cc, url, _ = recs[0]
    p = urlparse(url if re.match(r'https?://', url) else 'http://' + url)
    hosts.append({"host": h, "url": f"{p.scheme}://{p.netloc}{p.path or '/'}", "cc": cc, "n": len(recs)})
print("store hosts", len(hosts), "chain hosts skipped", chains)
json.dump(hosts, open("C:/temp/cafes/hosts_stores.json", "w"))
