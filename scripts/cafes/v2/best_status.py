import json, sys
sys.stdout.reconfigure(encoding="utf-8")
best = {}
for n in ("crawl.jsonl","crawl_intl.jsonl","crawl_intl_retry.jsonl","v2_a.jsonl","v2_a2.jsonl","v2_b.jsonl","v2_c.jsonl","v2_r1.jsonl"):
    try: f = open("C:/temp/cafes/"+n, encoding="utf-8")
    except FileNotFoundError: continue
    for l in f:
        try: r = json.loads(l)
        except Exception: continue
        h = r["host"]; old = best.get(h)
        if old is None or (r.get("status")=="ok" and old.get("status")!="ok") or (r.get("status")==old.get("status") and r.get("v",1)>=old.get("v",1)) or (old.get("status")!="ok" and r.get("v",1)>old.get("v",1)):
            best[h] = r
RETRY = {"TypeError","AbortError","Error","fail","error","http429","http500","http502","http503","http504","http520","http521","http522","http523","http524","http525","http526","http530","http409","http455","http200"}
hosts = [h for h,r in best.items() if r.get("status") in RETRY]
json.dump(hosts, open("C:/temp/cafes/retry_hosts_all.json","w"))
print(len(hosts))
for w in ("meritcoffee","mozartscoffee","desnudo","intelligentsia","hometowncoffee"): print(w, [(h,best[h].get("status")) for h in best if w in h][:5])
