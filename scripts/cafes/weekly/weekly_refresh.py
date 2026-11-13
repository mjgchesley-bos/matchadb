"""MatchaDB café data: the weekly refresh.

Run it weekly (see README.md in this folder). It never publishes anything unless every check passes.

  1. Sources   Once a month (when a newer release exists): re-export Overture places and Foursquare OS Places.
  2. Crawl     Re-check cafés' own websites for matcha (then render_step.py reads JavaScript-built ordering-platform menus):
                 - every site never checked (new places)
                 - every site currently listed (menus change, items get dropped)
                 - sites that failed (blocked / timed out / connection error) -- until they fail 4 weeks in a row
                 - one sixth of the "checked, no matcha" sites (so every site is re-read about every 6 weeks)
  3. Build     build_all2.py -> a temporary folder.
  4. Verify    totals do not drop, every region is non-empty, the known-café list is still present, JSON is valid, ids are unique.
  5. Publish   copy to the repo, `npm run build`, commit, push (Amplify deploys).
  6. Report    weekly_report.json / .md next to the data (the scheduled Claude task reads it and does the web spot-checks).

Usage: python -I weekly_refresh.py [--no-publish] [--no-crawl] [--max-hosts N]
"""
import argparse, collections, datetime, glob, json, os, re, shutil, subprocess, sys, urllib.request, zlib
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = "C:/temp/cafes"                     # large working files (place parquet files, crawl results). Not in git.
REPO = "C:/Users/mjgch/projects/matchadb"
STATE = f"{WORK}/weekly_state.json"
TODAY = datetime.date.today()
TAG = TODAY.strftime("%Y%m%d")
WEEK = TODAY.isocalendar()[1]
CONC = "40"
AGG = re.compile(r"(yelp|facebook|instagram|tripadvisor|doordash|ubereats|grubhub|google|toasttab|linktr\.ee|tiktok|twitter|x\.com|youtube|opentable|foursquare|tabelog|hotpepper|gnavi|retty|naver|kakao|wixsite|business\.site|square\.site|godaddysites|weebly|carrd\.co|beacons\.ai|bit\.ly|goo\.gl|order\.|menu\.|toast)", re.I)
RETRY = {"TypeError", "http429", "http500", "http502", "http503", "http504", "AbortError", "http409", "http408"}
MAX_FAILS = 4

log_lines = []
def log(*a):
    s = " ".join(str(x) for x in a)
    print(s, flush=True)
    log_lines.append(s)

def run(cmd, cwd=None, check=True, env=None, timeout=None):
    log("$", " ".join(cmd) if isinstance(cmd, list) else cmd)
    env = {**os.environ, **(env or {}), "PYTHONIOENCODING": "utf-8"}
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env, timeout=timeout, shell=isinstance(cmd, str))
    if p.stdout.strip(): log(p.stdout.strip()[-1500:])
    if p.returncode and check:
        log(p.stderr.strip()[-2500:])
        raise SystemExit(f"command failed ({p.returncode}): {cmd}")
    return p

def host_of(u):
    try:
        h = urlparse(u if re.match(r"https?://", u) else "http://" + u).netloc.lower()
    except Exception:
        return ""
    return re.sub(r"^www\.", "", h)

# ----------------------------------------------------------------------------------------------- 1. sources
def latest_overture():
    xml = urllib.request.urlopen("https://overturemaps-us-west-2.s3.amazonaws.com/?prefix=release/&delimiter=/", timeout=60).read().decode()
    rels = sorted(re.findall(r"release/(\d{4}-\d{2}-\d{2}\.\d+)/", xml))
    return rels[-1] if rels else None

def latest_fsq():
    tok = open(f"{WORK}/hf_token.txt").read().strip()
    req = urllib.request.Request("https://huggingface.co/api/datasets/foursquare/fsq-os-places/tree/main/release", headers={"Authorization": f"Bearer {tok}"})
    items = json.load(urllib.request.urlopen(req, timeout=60))
    ds = sorted(re.findall(r"dt=(\d{4}-\d{2}-\d{2})", " ".join(i["path"] for i in items)))
    return ds[-1] if ds else None

def refresh_sources():
    changed = {}
    for name, fn in (("overture", latest_overture), ("fsq", latest_fsq)):
        f = f"{WORK}/{name}_release.txt"
        have = open(f).read().strip() if os.path.exists(f) else ""
        try:
            new = fn()
        except Exception as e:
            log(f"could not look up the latest {name} release: {e}"); continue
        if new and new != have:
            log(f"{name}: new release {new} (had {have or 'none'})")
            changed[name] = new
    if "overture" in changed:
        rel = changed["overture"]
        for script in ("export.py", "export_intl.py", "export2.py"):
            src = open(f"{HERE}/{script}", encoding="utf-8").read()
            src = re.sub(r"\d{4}-\d{2}-\d{2}\.\d+", rel, src)
            tmp = f"{WORK}/_tmp_{script}"
            open(tmp, "w", encoding="utf-8").write(src)
            run([sys.executable, "-I", tmp], timeout=7200)
        run([sys.executable, "-I", f"{HERE}/export_au.py", rel, "", "overture"], timeout=7200)      # Australia
        run([sys.executable, "-I", f"{HERE}/export_nz.py", rel, "", "overture"], timeout=7200)      # New Zealand
        open(f"{WORK}/overture_release.txt", "w").write(rel)
    if "fsq" in changed:
        rel = changed["fsq"]
        for script in ("fsq_pull_all.py", "fsq_pull.py"):
            run([sys.executable, "-I", f"{HERE}/{script}", rel], timeout=7200)
        run([sys.executable, "-I", f"{HERE}/fsq_all_to_cands.py"])
        run([sys.executable, "-I", f"{HERE}/fsq_to_cands.py"])
        run([sys.executable, "-I", f"{HERE}/export_au.py", "", rel, "fsq"], timeout=7200)           # Australia
        run([sys.executable, "-I", f"{HERE}/export_nz.py", "", rel, "fsq"], timeout=7200)           # New Zealand
        open(f"{WORK}/fsq_release.txt", "w").write(rel)
    return changed

# ----------------------------------------------------------------------------------------------- 2. what to crawl
def crawl_results():
    """best status per host + whether it has matcha, from every crawl file (weekly files win over older ones)."""
    files = [f"{WORK}/{n}" for n in ("crawl.jsonl", "crawl_intl.jsonl", "crawl_stores.jsonl", "crawl_intl_retry.jsonl")]
    files += sorted(glob.glob(f"{WORK}/v2_*.jsonl"), key=os.path.getmtime) + sorted(glob.glob(f"{WORK}/w_*.jsonl"))
    best, matcha = {}, {}
    for f in files:
        if not os.path.exists(f): continue
        weekly = os.path.basename(f).startswith("w_")
        for l in open(f, encoding="utf-8"):
            try: r = json.loads(l)
            except Exception: continue
            h = r.get("host"); s = r.get("status")
            if not h: continue
            if s == "ok":
                best[h] = "ok"
                matcha[h] = bool(r.get("matcha")) if weekly else (matcha.get(h, False) or bool(r.get("matcha")))
            elif best.get(h) != "ok":
                best[h] = s
    return best, matcha

def place_hosts():
    import duckdb
    con = duckdb.connect()
    urls, cnt = {}, collections.Counter()
    for pq in ("us_cafes", "intl_cafes", "ext_cands", "fsq_cands", "fsq_all_cands", "au_cafes", "au_ext", "fsq_au_cafes", "nz_cafes", "nz_ext", "fsq_nz_cafes"):
        p = f"{WORK}/{pq}.parquet"
        if not os.path.exists(p): continue
        for (w,) in con.execute(f"select website from '{p}' where website is not null").fetchall():
            h = host_of(w)
            if not h or AGG.search(h): continue
            cnt[h] += 1
            urls.setdefault(h, w if re.match(r"https?://", w) else "http://" + w)
    return {h: u for h, u in urls.items() if cnt[h] < 25}      # a site shared by 25+ places is a chain: not listed

def listed_hosts():
    hs = set()
    for f in glob.glob(f"{REPO}/data/cafes/*.json"):
        for c in json.load(open(f, encoding="utf-8")):
            if c.get("url") and not c.get("via"): hs.add(host_of(c["url"]))
    return hs

def pick_hosts(max_hosts):
    urls = place_hosts()
    best, matcha = crawl_results()
    state = json.load(open(STATE)) if os.path.exists(STATE) else {}
    listed = listed_hosts()
    pick, why = {}, collections.Counter()
    for h, u in urls.items():
        s = best.get(h)
        fails = state.get(h, {}).get("fails", 0)
        slice6 = zlib.crc32(h.encode()) % 6 == WEEK % 6
        slice8 = zlib.crc32(h.encode()) % 8 == WEEK % 8
        if s is None: r = "new"
        elif h in listed or matcha.get(h): r = "listed"
        elif s in RETRY and fails < MAX_FAILS: r = "retry"
        elif s == "ok" and slice6: r = "rotate"
        elif s in ("http404", "http403", "http410") and slice8 and fails < MAX_FAILS: r = "retry-slow"
        else: continue
        pick[h] = u; why[r] += 1
    log("crawl set:", dict(why), "total", len(pick))
    items = [{"host": h, "url": u} for h, u in pick.items()]
    if max_hosts: items = items[:max_hosts]
    return items, state

def crawl(items):
    hosts_file = f"{WORK}/w_hosts_{TAG}.json"
    out = f"{WORK}/w_{TAG}.jsonl"
    json.dump(items, open(hosts_file, "w"))
    if os.path.exists(out): os.remove(out)
    run(["node", f"{HERE}/crawl2.cjs", hosts_file, out, CONC], cwd=WORK, timeout=60 * 60 * 40)
    return out

def update_state(state, out):
    seen = 0
    for l in open(out, encoding="utf-8"):
        try: r = json.loads(l)
        except Exception: continue
        h = r.get("host")
        if not h: continue
        seen += 1
        e = state.setdefault(h, {"fails": 0})
        if r.get("status") == "ok": e["fails"] = 0
        else: e["fails"] = e.get("fails", 0) + 1
        e["last"] = TAG
    json.dump(state, open(STATE, "w"))
    log("state updated for", seen, "hosts")

# ----------------------------------------------------------------------------------------------- 3-4. build + verify
def count_slim(d):
    return {k: len(json.load(open(f"{d}/cafes-slim-{k}.json", encoding="utf-8"))) for k in ("us", "ca", "eu", "jp", "kr", "au", "nz") if os.path.exists(f"{d}/cafes-slim-{k}.json")}

def build_and_verify(allow_drop=None):
    tmp_d, tmp_p = f"{WORK}/out_weekly/d", f"{WORK}/out_weekly/p"
    shutil.rmtree(f"{WORK}/out_weekly", ignore_errors=True)
    os.makedirs(tmp_d); os.makedirs(tmp_p)
    run([sys.executable, "-I", f"{HERE}/build_all2.py", tmp_d, tmp_p], cwd=WORK, timeout=7200)
    new, old = count_slim(tmp_p), count_slim(f"{REPO}/public/data")
    problems = []
    for k in new:
        if new[k] < 50: problems.append(f"{k}: only {new[k]} cafés")
        if old.get(k) and new[k] < old[k] * 0.97:
            msg = f"{k}: dropped from {old[k]} to {new[k]} (more than 3%)"
            if allow_drop: log(f"ALLOWED (reason given: {allow_drop}): {msg}")      # a deliberate rule change, reviewed by hand; recorded in the report
            else: problems.append(msg)
    ids = collections.Counter()
    for f in glob.glob(f"{tmp_d}/*.json"):
        try: data = json.load(open(f, encoding="utf-8"))
        except Exception as e: problems.append(f"{os.path.basename(f)}: invalid JSON ({e})"); continue
        for c in data:
            ids[c["id"]] += 1
            if not (-90 <= c["lat"] <= 90 and -180 <= c["lng"] <= 180): problems.append(f"bad coordinates {c['id']}")
    dups = [i for i, n in ids.items() if n > 1]
    if dups: problems.append(f"{len(dups)} duplicate ids")
    # PERMANENT INVARIANTS: lessons learned from hand audits, enforced on every build (invariants.py, regression_cases.json; see scripts/cafes/LESSONS.md)
    try:
        sys.path.insert(0, HERE); import invariants as INV
        built = []
        for f in glob.glob(f"{tmp_d}/*.json"): built += json.load(open(f, encoding="utf-8"))
        _sh = INV.shared_evidence(built)
        if _sh: problems.append(f"{len(_sh)} evidence pages shared by unrelated venues: {_sh[:3]}")
        _ad = INV.address_sanity(built)
        if _ad: problems.append(f"{len(_ad)} addresses with junk characters: {_ad[:3]}")
        _rc = f"{HERE}/regression_cases.json"
        if os.path.exists(_rc): problems += INV.regression(built, json.load(open(_rc, encoding="utf-8")))
        _un = f"{HERE}/unaudited_ids.json"
        if os.path.exists(_un): log(f"{len(json.load(open(_un)))} venues are not in the audit ledger yet (the weekly task reviews them)")
    except Exception as e:
        problems.append(f"invariant check failed to run: {e}")
    # known cafés that must stay listed (name fragment, city fragment)
    gold_file = f"{HERE}/gold_cafes.json"
    missing = []
    if os.path.exists(gold_file):
        names = collections.defaultdict(list)
        for f in glob.glob(f"{tmp_d}/*.json"):
            for c in json.load(open(f, encoding="utf-8")): names[c["name"].lower()].append(c["city"].lower())
        for g in json.load(open(gold_file, encoding="utf-8")):
            ok = any(g["name"].lower() in n and any(g["city"].lower() in ct for ct in cts) for n, cts in names.items())
            if not ok: missing.append(f"{g['name']} ({g['city']})")
        if len(missing) > max(2, 0.05 * len(json.load(open(gold_file, encoding="utf-8")))): problems.append(f"known cafés missing: {missing[:10]}")
    return tmp_d, tmp_p, new, old, problems, missing

# ----------------------------------------------------------------------------------------------- 5. publish
def publish(tmp_d, tmp_p, new, old):
    shutil.rmtree(f"{REPO}/data/cafes"); shutil.copytree(tmp_d, f"{REPO}/data/cafes")
    for f in glob.glob(f"{tmp_p}/cafes-slim-*.json"): shutil.copy(f, f"{REPO}/public/data/")
    for f in glob.glob(f"{HERE}/*"):                                    # keep the pipeline in git
        dest = f"{REPO}/scripts/cafes/weekly/{os.path.basename(f)}"
        if os.path.isfile(f) and os.path.abspath(f) != os.path.abspath(dest): shutil.copy(f, dest)
    r = run("npm run build", cwd=REPO, check=False, timeout=3600)
    if r.returncode:
        subprocess.run(["git", "checkout", "--", "data/cafes", "public/data"], cwd=REPO)
        raise SystemExit("npm run build failed; nothing was published")
    run(["git", "add", "-A"], cwd=REPO)
    msg = f"Cafés weekly refresh {TODAY}: {sum(old.values())} -> {sum(new.values())}\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
    run(["git", "commit", "-q", "-m", msg], cwd=REPO)
    run(["git", "push", "-q", "origin", "main"], cwd=REPO)

def review_suggestions():
    """Members' "Suggest a café" submissions: confirm the place is real and add it to the venue list (scripts/cafes/suggestions).
    Never blocks the weekly run. Suggestions too vague to place stay 'checking' for a human look."""
    S = f"{REPO}/scripts/cafes/suggestions"
    try:
        run([sys.executable, "-I", f"{S}/review_prepare.py"], timeout=3600, check=False)
        run([sys.executable, "-I", f"{S}/review_decide.py"], timeout=900, check=False)
    except Exception as e:
        log("suggestion review skipped:", repr(e))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-publish", action="store_true"); ap.add_argument("--no-render", action="store_true"); ap.add_argument("--no-crawl", action="store_true"); ap.add_argument("--max-hosts", type=int, default=0); ap.add_argument("--allow-drop", default=None, help="reason: let a reviewed, deliberate drop of more than 3% through (e.g. a new chain rule)")
    a = ap.parse_args()
    report = {"date": str(TODAY), "ok": False}
    try:
        report["sources_changed"] = refresh_sources()
        review_suggestions()
        if not a.no_crawl:
            items, state = pick_hosts(a.max_hosts)
            report["crawled_hosts"] = len(items)
            out = crawl(items)
            update_state(state, out)
            if not a.no_render:
                run([sys.executable, "-I", f"{HERE}/render_step.py"], timeout=60 * 60 * 12, check=False)      # JavaScript-built ordering-platform menus
        tmp_d, tmp_p, new, old, problems, missing = build_and_verify(a.allow_drop)
        report["allow_drop"] = a.allow_drop
        report.update({"before": old, "after": new, "problems": problems, "gold_missing": missing})
        log("before", old, "after", new)
        if problems:
            log("NOT PUBLISHING:", problems)
        elif a.no_publish:
            log("--no-publish: skipping")
        else:
            publish(tmp_d, tmp_p, new, old)
            report["ok"] = True
    except SystemExit as e:
        report["error"] = str(e)
    except Exception as e:
        report["error"] = repr(e)
    report["log_tail"] = log_lines[-40:]
    json.dump(report, open(f"{WORK}/weekly_report.json", "w"), indent=1)
    log("report written to", f"{WORK}/weekly_report.json", "ok =", report["ok"])

if __name__ == "__main__":
    main()
