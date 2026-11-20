import json, urllib.request, urllib.parse, sys, datetime, re, glob, collections
sys.stdout.reconfigure(encoding="utf-8")
H = "C:/Users/mjgch/.matchadb-google/"
C = json.load(open(H + "client.json"))["installed"]; T = json.load(open(H + "token.json"))
d = urllib.parse.urlencode({"client_id": C["client_id"], "client_secret": C["client_secret"], "refresh_token": T["refresh_token"], "grant_type": "refresh_token"}).encode()
acc = json.load(urllib.request.urlopen(urllib.request.Request(C["token_uri"], data=d)))["access_token"]
SITE = urllib.parse.quote("sc-domain:matchadb.com", safe="")
Q = f"https://www.googleapis.com/webmasters/v3/sites/{SITE}/searchAnalytics/query"
end = datetime.date.today() - datetime.timedelta(days=3); start = end - datetime.timedelta(days=89)
rows = []
off = 0
while True:
    b = {"startDate": str(start), "endDate": str(end), "dimensions": ["page"], "rowLimit": 25000, "startRow": off,
         "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "contains", "expression": "/cafes/"}]}]}
    r = urllib.request.Request(Q, data=json.dumps(b).encode(), headers={"Authorization": "Bearer " + acc, "Content-Type": "application/json"})
    got = json.load(urllib.request.urlopen(r)).get("rows", [])
    rows += got
    if len(got) < 25000: break
    off += 25000
print("café page rows:", len(rows))

agg = collections.defaultdict(lambda: [0, 0])
for r in rows:
    m = re.search(r"/cafes/([^/?#]+)", r["keys"][0])
    if not m: continue
    cid = m.group(1).rsplit("-", 1)[-1]
    agg[cid][0] += int(r["clicks"]); agg[cid][1] += int(r["impressions"])

cafes = {}
for f in glob.glob("C:/Users/mjgch/projects/matchadb/data/cafes/*.json"):
    for c in json.load(open(f, encoding="utf-8")):
        cafes[c["id"]] = c
prof = json.load(open("C:/Users/mjgch/projects/matchadb/data/cafe-profiles.json", encoding="utf-8"))
extras = json.load(open("C:/Users/mjgch/projects/matchadb/data/cafe-extras.json", encoding="utf-8"))
out = []
for cid, (cl, im) in agg.items():
    c = cafes.get(cid)
    if not c: continue
    out.append({"id": cid, "name": c["name"], "city": c.get("city"), "cc": c.get("cc"), "url": c.get("url"), "clicks": cl, "impr": im,
                "has_profile": cid in prof, "has_extras": cid in extras})
out.sort(key=lambda x: (-x["clicks"], -x["impr"]))
json.dump(out, open("C:/temp/cafe_traffic.json", "w", encoding="utf-8"), ensure_ascii=False)
print("cafés with traffic:", len(out), "| total clicks", sum(x["clicks"] for x in out), "impr", sum(x["impr"] for x in out))
withurl = [x for x in out if x["url"]]
print("with a website on file:", len(withurl), "| clicks covered:", sum(x["clicks"] for x in withurl))
for x in out[:25]:
    print(x["clicks"], x["impr"], x["name"][:40], "|", x["city"], x["cc"], "|", x["url"] or "-", "| profile" if x["has_profile"] else "", "| extras" if x["has_extras"] else "")
