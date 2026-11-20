import json, re, sys, urllib.parse
sys.stdout.reconfigure(encoding="utf-8")
R = "C:/Users/mjgch/projects/matchadb/"
d = json.load(open("C:/temp/crawl_shops.json", encoding="utf-8"))
raw = open(R + "data/cafe-profiles.json", encoding="utf-8").read()
prof = json.loads(raw)
SYM = {"USD": "$", "GBP": "£", "EUR": "€", "AUD": "A$", "CAD": "C$", "NZD": "NZ$", "JPY": "¥"}
host = lambda u: urllib.parse.urlparse(u or "").netloc.lower().removeprefix("www.")
def money(v, cur, frm):
    n = f"{v:,.2f}"
    n = n[:-3] if n.endswith(".00") else n
    sym = SYM.get(cur or "")
    return ("from " if frm else "") + (f"{sym}{n}" if sym else f"{n} {cur or ''}".strip())
def rank(i):
    n = i["name"].lower()
    return (0 if "matcha" in n and not re.search(r"whisk|chasen|bowl|scoop|sieve|spoon|schale|set", n) else 1 if "hojicha" in n else 2, n)
added, skipped = 0, []
for cid, v in d.items():
    if not v["items"] or prof.get(cid, {}).get("shop"): continue
    h = host(v["url"])
    items = [i for i in v["items"] if host(i.get("url")) == h]
    if not items: skipped.append(v["name"]); continue
    for i in items:
        i["name"] = re.sub(r"\s*[—–-]\s*Your Site Title", "", i["name"]); i["name"] = re.sub(r"^SALE:\s*", "", i["name"])
    items = sorted(items, key=rank)[:8]
    prof.setdefault(cid, {})["shop"] = [{"name": i["name"], "price": money(i["price"], i.get("currency"), i.get("from")), "url": i["url"]} for i in items]
    added += 1
raw = json.dumps(prof, ensure_ascii=False, indent=2 if raw.startswith("{\n  ") else None).replace("\u00a0", " ")
open(R + "data/cafe-profiles.json", "w", encoding="utf-8").write(raw)
print("added:", added, "| skipped (items from another site):", skipped)
