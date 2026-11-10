"""Pull new "Suggest a café" submissions from Supabase for checking (read-only).

Suggestions come only from signed-in members. The review (scripts/cafes/suggestions: review_prepare.py + review_decide.py, run by
weekly_refresh.py) confirms the place is real and adds it; this script just lists what is waiting.
Uses the secret key from the repo's .env.local on this machine; the key is never printed or sent anywhere but Supabase.
usage: python -I pull_suggestions.py   ->  C:/temp/cafes/suggestions_new.json
"""
import json, os, re, sys, urllib.error, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ENV = "C:/Users/mjgch/projects/matchadb/.env.local"
OUT = "C:/temp/cafes/suggestions_new.json"
URL = "https://gropvtwigbddfikcujhz.supabase.co"


def env(name):
    for line in open(ENV, encoding="utf-8"):
        m = re.match(rf"^{name}=(.*)$", line.strip())
        if m:
            return m.group(1).strip().strip('"').strip("'")
    return ""


key = env("SUPABASE_SECRET_KEY")
if not key:
    sys.exit("SUPABASE_SECRET_KEY is not set in .env.local")
req = urllib.request.Request(f"{URL}/rest/v1/cafe_suggestions?status=eq.new&order=created_at.asc&select=*", headers={"apikey": key, "Authorization": f"Bearer {key}"})
try:
    rows = json.loads(urllib.request.urlopen(req, timeout=30).read())
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", "ignore")[:200]
    if e.code == 404 or "does not exist" in body or "PGRST205" in body:
        sys.exit("The cafe_suggestions table does not exist yet: run supabase/cafe_suggestions.sql once in the Supabase SQL editor.")
    sys.exit(f"Supabase said {e.code}: {body}")
json.dump(rows, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(rows)} new suggestion(s) -> {OUT}")
for r in rows:
    print(" -", r["created_at"][:10], r["name"], "|", r["address"], "|", r.get("link") or "")
