"""Matcha-news refresh. No LLM, no paid service: one polite request to GDELT's open news index (retried, since it rate-limits),
filtered the same way as the site and merged into data/news-live.json. The scheduled workflow commits the file if it changed."""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request, datetime
sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = REPO + "/data/news-live.json"
UA = "MatchaDBBot/1.0 (+https://www.matchadb.com)"
BLOCKED = re.compile(r"(^|\.)(wholefoodsmarket|amazon|walmart|ebay|etsy|target|instacart|aliexpress|temu|alibaba|shopify|pinterest|facebook|instagram|reddit|youtube|tiktok)\.", re.I)
CLASSIFY = [
    ("japan", r"\b(japan|japanese|uji|kyoto|shizuoka|kagoshima|nishio|tencha|tea farm|farmers?|growers?|harvest|aichi)\b"),
    ("business", r"\b(price|prices|shortage|market|sales|revenue|export|exports|import|tariff|supply|business|startup|earnings|brand|company|investor|funding|stock|starbucks|billion|million)\b"),
    ("health", r"\b(health|healthy|study|studies|research|benefit|benefits|antioxidants?|weight|liver|caffeine|dietitian|nutrition|theanine|doctor|science)\b"),
    ("cafes", r"\b(cafe|café|cafes|opens|opening|shop|restaurant|menu|latte|bar|bakery|best matcha|coffee|boba)\b"),
]
def category(t):
    for k, rx in CLASSIFY:
        if re.search(rx, t, re.I): return k
    return "culture"

q = urllib.parse.urlencode({"query": "matcha sourcelang:english", "mode": "artlist", "format": "json", "maxrecords": 100, "sort": "datedesc", "timespan": "7d"})
arts = None
for attempt in range(8):
    try:
        r = urllib.request.urlopen(urllib.request.Request("https://api.gdeltproject.org/api/v2/doc/doc?" + q, headers={"User-Agent": UA}), timeout=40)
        arts = json.loads(r.read().decode("utf-8", "ignore")).get("articles", [])
        break
    except Exception as e:
        print("attempt", attempt + 1, "failed:", str(e)[:60]); time.sleep(30 * (attempt + 1))
if arts is None:
    print("GDELT unavailable; leaving the saved news unchanged"); sys.exit(0)

new = []
for a in arts:
    t = re.sub(r"\s+", " ", a["title"]).strip()
    if not re.search("matcha", t, re.I) or len(t) > 150 or BLOCKED.search(a["domain"]): continue
    if a.get("language") and not re.search("english", a["language"], re.I): continue
    s = a["seendate"]
    new.append({"title": t, "url": a["url"], "source": re.sub(r"^www\.", "", a["domain"]), "date": f"{s[:4]}-{s[4:6]}-{s[6:8]}", "category": category(t)})

old = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else []
seen, merged = set(), []
for it in new + old:
    k = re.sub(r"[^a-z0-9]+", " ", it["title"].lower()).strip()[:60]
    if it["url"] in seen or k in seen: continue
    seen.add(it["url"]); seen.add(k); merged.append(it)
cutoff = (datetime.date.today() - datetime.timedelta(days=60)).isoformat()
merged = sorted([m for m in merged if m["date"] >= cutoff], key=lambda m: m["date"], reverse=True)[:150]
text = json.dumps(merged, ensure_ascii=False, indent=1) + "\n"
if os.path.exists(OUT) and open(OUT, encoding="utf-8").read() == text:
    print("no change"); sys.exit(0)
open(OUT, "w", encoding="utf-8").write(text)
print("wrote", len(merged), "items,", len(new), "from this pull")
