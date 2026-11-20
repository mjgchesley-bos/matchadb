import json, re, sys
sys.stdout.reconfigure(encoding="utf-8")
R = "C:/Users/mjgch/projects/matchadb/"
d = json.load(open("C:/temp/crawl_menus.json", encoding="utf-8"))
raw = open(R + "data/cafe-profiles.json", encoding="utf-8").read()
prof = json.loads(raw)
EMOJI = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F]")
def amount(p):
    m = re.search(r"\d+(?:[.,]\d{1,2})?", p)
    return float(m.group(0).replace(",", ".")) if m else None
def clean_price(p):
    p = re.sub(r"([$£€¥])\s+", r"\1", p.strip())
    return re.sub(r"\s+", " ", p)
def title(n):
    return n.title() if n.isupper() else n
added = dropped = 0
for cid, v in d.items():
    if not v["items"] or prof.get(cid, {}).get("menu"): continue
    out, seen = [], set()
    for i in v["items"]:
        n = EMOJI.sub("", i["name"]).strip(" .:-–—|·•,+")
        n = re.sub(r"\s+(S|M|L|S L|S M L|From|from)$", "", n).strip()
        a = amount(i["price"])
        yen = "¥" in i["price"] or re.search(r"[¥円]", i["line"])
        if a is None or (a > 20 and not yen) or (yen and a > 2500): dropped += 1; continue          # products and tins belong in a Shop panel
        if re.search(r"\b(extra|add|add-?on|upgrade|substitute)\b", n, re.I) or n.endswith("+"): dropped += 1; continue
        if len(n) > 48 or n.count(",") >= 2 or (n.count(",") == 1 and n[:1].islower()): dropped += 1; continue  # a description, not an item name
        if n.lower() in ("matcha",) and a and a > 12: dropped += 1; continue
        n = title(n)
        if n.lower() in seen: continue
        seen.add(n.lower())
        out.append({"name": n, "price": clean_price(i["price"])})
    if out:
        prof.setdefault(cid, {})["menu"] = out[:8]
        added += 1
raw = json.dumps(prof, ensure_ascii=False, indent=2 if raw.startswith("{\n  ") else None).replace("\u00a0", " ")
open(R + "data/cafe-profiles.json", "w", encoding="utf-8").write(raw)
print("cafés with a menu added:", added, "| items dropped:", dropped)
