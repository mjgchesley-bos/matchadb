import json, re, sys
from urllib.parse import unquote
sys.stdout.reconfigure(encoding="utf-8")
p = r"C:\Users\mjgch\.claude\projects\C--Program-Files-Git\bb02e71c-8e12-4751-a3c2-550705c51b75\tool-results\mcp-f3092e41-8e7f-45ea-9260-f81e60ece419-firecrawl_scrape-1794000335089.txt"
j = json.load(open(p, encoding="utf-8")); md = j.get("markdown") or j["data"]["markdown"]
PROV = {"BC": "British Columbia", "ON": "Ontario", "QC": "Quebec", "AB": "Alberta", "MB": "Manitoba", "NB": "New Brunswick"}
places = []
for m in re.finditer(r'destination=([^)\s]+)\)', md):
    dest = unquote(m.group(1)).replace(", Canada", "")
    before = md[: m.start()]
    names = re.findall(r'^(DAVIDsTEA [^\n]+?)(?:\s+Now Open!)?\s*$', before, re.M)
    names = [n for n in names if not n.startswith("DAVIDsTEA Store")]
    if not names: continue
    name = names[-1].strip()
    seg = md[before.rfind(name): m.end()]
    exp = re.findall(r'^(Beverage Bar|Matcha Bar)\s*$', seg, re.M)
    parts = [x.strip() for x in dest.split(",")]
    last = parts[-1]
    pm = re.search(r'([A-Z]\d[A-Z]\s?\d[A-Z]\d)$', last)
    if pm:
        postal = pm.group(1); region = last[: pm.start()].strip(); city = parts[-2]; addr_parts = parts[:-2]
        if not region:                       # "Quebec City, G1V 2L8"
            region = "Quebec" if postal[0] in "GHJ" else "Ontario"
        if region in PROV: region = PROV[region]
    else:                                    # "Burnaby, BC V5H" (partial postal) or no postal at all
        mm = re.match(r'([A-Za-z ]+?)\s+([A-Z]\d[A-Z])$', last)
        region = PROV.get(mm.group(1), mm.group(1)) if mm else last
        postal = mm.group(2) if mm else ""
        city = parts[-2]; addr_parts = parts[:-2]
    places.append({"name": name, "address": ", ".join(addr_parts), "city": city, "region": region, "postal": postal, "matcha_bar": "Matcha Bar" in exp})
print(len(places), "stores,", sum(p["matcha_bar"] for p in places), "with a Matcha Bar")
for x in places: print(x["name"], "|", x["address"], "|", x["city"], x["region"], x["postal"])
json.dump(places, open("C:/temp/cafes/davids_places.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
