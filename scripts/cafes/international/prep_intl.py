import duckdb, json, re, sys
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding="utf-8")
con = duckdb.connect()
rows = con.execute("SELECT id, name, cc, website, brand, brand_wikidata FROM 'C:/temp/cafes/intl_cafes.parquet' WHERE website IS NOT NULL AND name IS NOT NULL").fetchall()
ORDER = ["CA", "GB", "IE", "JP", "KR", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "LU", "SE", "NO", "DK", "FI", "IS", "PL", "CZ", "SK", "HU", "PT", "GR", "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY"]
rank = {c: i for i, c in enumerate(ORDER)}

def host_of(u):
    try:
        h = urlparse(u if re.match(r'https?://', u) else 'http://' + u).netloc.lower()
    except Exception:
        return None
    return re.sub(r'^www\.', '', h) or None

# pages that are not the cafe's own site (social, listing, delivery and review sites)
THIRD = re.compile(r'(facebook|instagram|yelp|tripadvisor|google|goo\.gl|linktr\.ee|twitter|x\.com|tiktok|doordash|ubereats|grubhub|opentable|foursquare|mapquest|yellowpages|'
                   r'tabelog|hotpepper|gnavi|retty|ameblo|line\.me|lin\.ee|rakuten|jalan|ikyu|navitime|mapion|wolt|deliveroo|just-eat|justeat|lieferando|thefork|booking|restaurantguru|'
                   r'naver|kakao|daum|tistory|youtube|pinterest|linkedin|wixsite\.com/|business\.site|page\.link|bit\.ly|menupix|zomato|10best|cylex|pagesjaunes|yell\.com|'
                   r'seamless|skipthedishes|ritual\.co|toasttab|clover\.com|order\.online|dripos)\.?', re.I)

brand_count = {}
for r in rows:
    if r[5]: brand_count[r[5]] = brand_count.get(r[5], 0) + 1
by_host = {}
for id_, name, cc, web, brand, wd in rows:
    h = host_of(web)
    if not h: continue
    by_host.setdefault(h, []).append((cc, web, wd))
hosts, chains, skipped = [], [], 0
for h, recs in by_host.items():
    if THIRD.search(h):
        skipped += 1; continue
    cc = min((r[0] for r in recs), key=lambda c: rank.get(c, 99))
    chain = any(wd and brand_count.get(wd, 0) >= 15 for _, _, wd in recs) or len(recs) >= 25
    url = next(r[1] for r in recs if r[0] == cc)
    p = urlparse(url if re.match(r'https?://', url) else 'http://' + url)
    url = f"{p.scheme}://{p.netloc}{p.path or '/'}"
    (chains if chain else hosts).append({"host": h, "url": url, "cc": cc, "n": len(recs)})
hosts.sort(key=lambda x: rank.get(x["cc"], 99))
print("hosts", len(hosts), "chains", len(chains), "third-party skipped", skipped)
from collections import Counter
print(Counter(h["cc"] for h in hosts).most_common(12))
json.dump(hosts, open("C:/temp/cafes/hosts_intl.json", "w"))
json.dump(chains, open("C:/temp/cafes/chains_intl.json", "w"))
