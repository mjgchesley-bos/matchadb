import duckdb, json, re, sys
from urllib.parse import urlparse
from collections import Counter
sys.stdout.reconfigure(encoding="utf-8")
exec(open("C:/temp/cafes/prep_intl.py", encoding="utf-8").read().split("brand_count = {}")[0].split("con = duckdb.connect()")[0])  # imports only
THIRD = re.compile(re.search(r"THIRD = re.compile\(r'(.*?)', re.I\)", open("C:/temp/cafes/prep_intl.py", encoding="utf-8").read().replace("'\n                   r'", ""), re.S).group(1), re.I)
def host_of(u):
    try: h = urlparse(u if re.match(r'https?://', u) else 'http://' + u).netloc.lower()
    except Exception: return None
    return re.sub(r'^www\.', '', h) or None
con = duckdb.connect()
core = con.execute("""select id,name,cat,cc,website,brand_wikidata,false as nm from (
  select id,name,cat,'US' cc,website,brand_wikidata from 'C:/temp/cafes/us_cafes.parquet'
  union all select id,name,cat,cc,website,brand_wikidata from 'C:/temp/cafes/intl_cafes.parquet') where website is not null""").fetchall()
ext = con.execute("select id,name,cat,cc,website,brand_wikidata,name_match from 'C:/temp/cafes/ext_cands.parquet' where website is not null").fetchall()
LOWYIELD = {"bakery","japanese_restaurant","sandwich_shop","chocolatier","confectionery","pastry_shop","patisserie_chocolatier","vegan_restaurant","bagel_shop","food_truck_stand"}
ORDER = ["US","CA","JP","KR","GB","DE","FR","IT","ES","NL","BE","AT","CH","IE","SE","NO","DK","FI","IS","PL","CZ","SK","HU","PT","GR","RO","BG","HR","SI","EE","LV","LT","MT","CY","LU"]
rank = {c:i for i,c in enumerate(ORDER)}
seen_id=set(); rows=[]
for r in core+ext:
    if r[0] in seen_id: continue
    seen_id.add(r[0]); rows.append(r)
brand_count = Counter(r[5] for r in rows if r[5])
by_host = {}
for id_,name,cat,cc,web,wd,nm in rows:
    h = host_of(web)
    if not h or THIRD.search(h): continue
    by_host.setdefault(h, []).append((cc, web, wd, cat, nm))
prior = {}
for f in ["crawl.jsonl","crawl_intl.jsonl","crawl_intl_retry.jsonl","crawl_stores.jsonl"][:3]:
    for l in open("C:/temp/cafes/"+f, encoding="utf-8"):
        try: r = json.loads(l)
        except Exception: continue
        old = prior.get(r["host"])
        if old and old.get("status") == "ok" and r.get("status") != "ok": continue
        prior[r["host"]] = r
chain_known = {c["host"] for c in json.load(open("C:/temp/cafes/chain_hosts.json"))} | {c["host"] for c in json.load(open("C:/temp/cafes/chains_intl.json"))}
A, B, C, chains = [], [], [], []
dead = {"http404","http410","robots","http403","http401","http451","http444","badurl"}
for h, recs in by_host.items():
    cc = min((r[0] for r in recs), key=lambda c: rank.get(c, 99))
    chain = h in chain_known or any(r[2] and brand_count.get(r[2], 0) >= 15 for r in recs) or len(recs) >= 25
    url = next(r[1] for r in recs if r[0] == cc)
    p = urlparse(url if re.match(r'https?://', url) else 'http://' + url)
    ent = {"host": h, "url": f"{p.scheme}://{p.netloc}{p.path or '/'}", "cc": cc, "n": len(recs)}
    if chain: chains.append(ent); continue
    pr = prior.get(h)
    cats = {r[3] for r in recs}; has_nm = any(r[4] for r in recs)
    core_cat = any(r[3] in {"coffee_shop","cafe","bubble_tea_shop","tea_room","coffee_roastery","hong_kong_style_cafe","cat_cafe","dog_cafe","internet_cafe"} for r in recs)
    if pr is not None:
        st = pr.get("status")
        if st == "ok" and pr.get("matcha"): continue
        if st in dead: continue
        if st == "ok" and pr.get("pages", 9) > 2: continue
        A.append(ent)   # failed or thin
    else:
        if has_nm or not (cats <= LOWYIELD): B.append(ent)
        else: C.append(ent)
for L in (A, B, C): L.sort(key=lambda x: rank.get(x["cc"], 99))
print("A recrawl", len(A), Counter(x["cc"] for x in A).most_common(6))
print("B new", len(B), Counter(x["cc"] for x in B).most_common(6))
print("C low-yield new", len(C), Counter(x["cc"] for x in C).most_common(6))
print("chains", len(chains))
for n, L in (("a", A), ("b", B), ("c", C)): json.dump(L, open(f"C:/temp/cafes/hosts_v2_{n}.json", "w"))
