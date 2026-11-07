import json,re,collections,sys
sys.stdout.reconfigure(encoding="utf-8")
rows=[json.loads(l) for l in open("C:/temp/cc_matcha_hosts.jsonl",encoding="utf-8")]
rows=[r for r in rows if r["host"]]
dom=collections.defaultdict(lambda:{"n":0,"hosts":set()})
for r in rows:
    d=r["domain"]
    if not d or not re.search("matcha|maccha",d): continue
    dom[d]["n"]+=r["n"]; dom[d]["hosts"].add(r["host"])
print(len(rows),"hosts;",len(dom),"registered domains containing matcha")
done=set()
for f in ["crawl.jsonl","crawl_intl.jsonl","v2_a.jsonl","v2_b.jsonl","v2_c.jsonl"]:
    try:
        for l in open("C:/temp/cafes/"+f,encoding="utf-8"):
            try: done.add(json.loads(l)["host"])
            except: pass
    except FileNotFoundError: pass
leads=[]
for d,v in dom.items():
    host = "www."+d if "www."+d in v["hosts"] else (d if d in v["hosts"] else sorted(v["hosts"])[0])
    leads.append({"host":d,"url":f"https://{host}/","n":v["n"],"seen_in_overture_crawl":d in done})
print(sum(l["seen_in_overture_crawl"] for l in leads),"already crawled via Overture")
print(collections.Counter(d.rsplit(".",1)[-1] for d in dom).most_common(12))
json.dump(leads,open("C:/temp/cafes/leads.json","w"))
