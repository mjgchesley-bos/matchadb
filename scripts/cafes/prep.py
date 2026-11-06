import duckdb, json, re
from urllib.parse import urlparse
con = duckdb.connect()
rows = con.execute("SELECT id, name, website, brand, brand_wikidata FROM 'C:/temp/cafes/us_cafes.parquet' WHERE website IS NOT NULL").fetchall()
def host_of(u):
    try:
        h = urlparse(u).netloc.lower()
    except Exception:
        return None
    return re.sub(r'^www\.', '', h) or None
by_host = {}
brand_count = {}
for id_, name, web, brand, wd in rows:
    if wd: brand_count[wd] = brand_count.get(wd, 0) + 1
for id_, name, web, brand, wd in rows:
    h = host_of(web)
    if not h: continue
    by_host.setdefault(h, []).append((id_, name, web, brand, wd))
social = re.compile(r'(facebook|instagram|yelp|tripadvisor|google|linktr\.ee|twitter|x\.com|tiktok|doordash|ubereats|grubhub|opentable|foursquare|mapquest|yellowpages)\.')
hosts, chain_hosts, skipped_social = [], [], 0
for h, recs in by_host.items():
    if social.search(h + "."): skipped_social += 1; continue
    chain = any(wd and brand_count.get(wd, 0) >= 15 for _, _, _, _, wd in recs) or len(recs) >= 25
    url = recs[0][2]
    p = urlparse(url if re.match(r'https?://', url) else 'http://' + url)
    url = f"{p.scheme}://{p.netloc}{p.path or '/'}"
    (chain_hosts if chain else hosts).append({"host": h, "url": url, "n": len(recs)})
print("hosts", len(hosts), "chain hosts", len(chain_hosts), "social skipped", skipped_social)
print(sorted(chain_hosts, key=lambda x: -x["n"])[:25])
json.dump(hosts, open("C:/temp/cafes/hosts.json", "w"))
json.dump(chain_hosts, open("C:/temp/cafes/chain_hosts.json", "w"))
# sample: 300 hosts plus a few known matcha places
import random
random.seed(1)
samp = random.sample(hosts, 300)
for h in hosts:
    if h["host"] in ("matchaful.com",): samp.append(h)
json.dump(samp, open("C:/temp/cafes/sample.json", "w"))
