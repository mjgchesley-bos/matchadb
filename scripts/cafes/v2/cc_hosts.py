import duckdb, sys, json, os, time
sys.stdout.reconfigure(encoding="utf-8")
paths = [l.strip() for l in open("C:/temp/cc_paths.txt") if l.strip()]
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET threads=8; SET http_retries=6; SET http_timeout=120000;")
out = "C:/temp/cc_matcha_hosts.jsonl"
done = set()
if os.path.exists(out):
    for l in open(out, encoding="utf-8"):
        try: done.add(json.loads(l)["file"])
        except Exception: pass
f = open(out, "a", encoding="utf-8")
t0 = time.time()
for i, p in enumerate(paths):
    if p in done: continue
    url = "https://data.commoncrawl.org/" + p
    for attempt in range(3):
        try:
            rows = con.execute(f"""select url_host_name, url_host_registered_domain, url_host_tld, count(*) n
              from read_parquet('{url}') where regexp_matches(url_host_name, 'matcha|maccha|matcha')
              group by 1,2,3""").fetchall()
            break
        except Exception as e:
            rows = None; time.sleep(5)
    if rows is None:
        print("FAILED", p, flush=True); continue
    for r in rows:
        f.write(json.dumps({"file": p, "host": r[0], "domain": r[1], "tld": r[2], "n": r[3]}) + "\n")
    f.write(json.dumps({"file": p, "host": None}) + "\n"); f.flush()
    print(i + 1, len(paths), len(rows), int(time.time() - t0), "s", flush=True)
print("DONE", flush=True)
