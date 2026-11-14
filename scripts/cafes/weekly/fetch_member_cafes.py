"""Café ids that members have rated, commented on, photographed or favorited. Audits must never remove these:
people who visit a place and rate it are real evidence it exists. Writes member_cafes.json next to this script.
On any failure the previous file is kept."""
import json, os, re, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
ENV = "C:/Users/mjgch/projects/matchadb/.env.local"
def main():
    env = dict(l.strip().split("=", 1) for l in open(ENV, encoding="utf-8") if "=" in l and not l.startswith("#"))
    key, url = env["SUPABASE_SECRET_KEY"], env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/"
    def get(q):
        req = urllib.request.Request(url + q, headers={"apikey": key, "Authorization": "Bearer " + key})
        return json.load(urllib.request.urlopen(req, timeout=60))
    ids = {r["cafe_id"] for r in get("cafe_ratings?select=cafe_id")} | {r["cafe_id"] for r in get("favorite_cafes?select=cafe_id")} \
        | {r["target_key"] for r in get("comments?select=target_key&target_type=eq.cafe&status=eq.approved")}
    ids = sorted(i for i in ids if re.fullmatch(r"[0-9a-f]{10}|fsq[0-9a-f]{7}", i))
    json.dump(ids, open(os.path.join(HERE, "member_cafes.json"), "w"))
    print("member café ids:", len(ids))
try: main()
except Exception as e: print("member café fetch failed, keeping the old file:", str(e)[:80])
