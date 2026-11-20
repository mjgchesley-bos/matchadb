import json, re, sys
sys.stdout.reconfigure(encoding="utf-8")
R = "C:/Users/mjgch/projects/matchadb/"
d = json.load(open("C:/temp/shop_probe2.json", encoding="utf-8"))
raw = open(R + "data/cafe-profiles.json", encoding="utf-8").read()
prof = json.loads(raw)
SYM = {"USD": "$", "GBP": "£", "EUR": "€", "AUD": "A$", "CAD": "C$", "NZD": "NZ$", "CZK": "Kč", "JPY": "¥"}

def money(v, cur, frm):
    if v is None: return None
    n = f"{v:,.2f}".rstrip("0").rstrip(".") if v % 1 else f"{int(v):,}"
    if v % 1 and len(n.split(".")[-1]) == 1: n += "0"
    sym = SYM.get(cur or "", None)
    txt = f"{sym}{n}" if sym and cur not in ("CZK",) else (f"{n} {sym}" if sym else f"{n} {cur or ''}".strip())
    return ("from " if frm else "") + txt

def rank(i):
    n = i["name"].lower()
    return (0 if "matcha" in n and not re.search(r"whisk|chasen|bowl|scoop|chashaku", n) else 1 if "hojicha" in n or "houjicha" in n else 2, i["name"])

added = 0
for cid, v in d.items():
    items = v.get("items") or []
    if not items or cid in prof and prof[cid].get("shop"): continue
    items = sorted([i for i in items if i["price"] is not None and i["available"]], key=rank)[:8]
    if not items: continue
    shop = [{"name": i["name"], "price": money(i["price"], v.get("currency"), i["from"]), "url": i["url"]} for i in items]
    prof.setdefault(cid, {})["shop"] = shop
    added += 1
json.dump(prof, open(R + "data/cafe-profiles.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2 if raw.startswith("{\n  ") else None)
print("profiles with a shop added:", added)
