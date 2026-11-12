import re, json, glob, sys, collections, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
RESTAURANT=lambda cat: bool(cat) and (cat.endswith("restaurant") or cat in ("bar","pub"))
M=re.compile(r"matcha|抹茶|말차|マッチャ|まっちゃ",re.I)
DRINK=re.compile(
 r"matcha[\s\-–]*(?:menu|bar|station|specials?|latte|lattes|tea|drink|shake|smoothie|lemonade|soda|frapp\w*|milk|coffee|espresso|chai|iced|hot|cold ?brew|tonic|mocha|cappuccino|boba|bubble)"
 r"|(?:iced|hot|cold|ceremonial|dirty|oat|coconut|strawberry|blueberry|vanilla|honey|lavender|pistachio|mango)\s+matcha"
 r"|(?:latte|tea|green tea latte|drink)\s+(?:de |au |with |w/ |mit |al )?matcha|(?:th[eé]|t[eé]|t[eé]e|tee|kaffee|latté)\s+matcha|matcha\s+(?:th[eé]|t[eé])\b"
 r"|抹茶(?:ラテ|オレ|ミルク|ドリンク|ティー|フラッペ|スムージー|ソーダ|ジュース|カフェオレ|ティ|茶)|お抹茶|(?:ホット|アイス|HOT|ICE|Hot|Ice)\s*[・]?\s*抹茶(?!アイス|ソフト|ケーキ|プリン|パフェ|ゼリー|ロール)|抹茶\s*[（(\[]?\s*(?:ホット|HOT|Hot|温|冷)"
 r"|말차\s?(?:라떼|라테|음료|티|에이드|스무디)|マッチャ(?:ラテ|ドリンク|ティー)",re.I)
LIST=re.compile(r"ドリンク|飲み物|ソフトドリンク|お茶|beverages?|drinks?|boissons|getr[aä]nke|bebidas|bevande|음료|hot drinks|cold drinks|non-?coffee|coffee|espresso|latte|chai",re.I)
DESSERT=re.compile(r"soba|udon|ramen|noodle|salad|pasta|pizza|そば|うどん|ラーメン|ice ?cream|gelato|cake|cookie|brownie|tiramisu|cheesecake|mochi|parfait|pudding|croissant|donut|sundae|dessert|ケーキ|アイス|パフェ|プリン|ソフト|ゼリー|ロール|クッキー|もち|餅|大福|団子|tempura|salt|塩|バンズ|bun\b",re.I)
def drink_ctx(ctx):
    for m in M.finditer(ctx):
        a,b=max(0,m.start()-40),m.end()+40
        win=ctx[a:b]
        if DRINK.search(ctx[max(0,m.start()-25):m.end()+25]): return True
        wide=ctx[max(0,m.start()-150):m.end()+150]
        # plain "matcha" listed among drinks, not directly attached to a dessert word
        if LIST.search(wide) and not DESSERT.search(ctx[max(0,m.start()-20):m.end()+20]) and len(LIST.findall(wide))>=3: return True
    return False
if __name__=="__main__":
    data={}
    for f in glob.glob("C:/Users/mjgch/projects/matchadb/data/cafes/*.json"):
        for c in json.load(open(f,encoding="utf-8")): data[c["id"]]=c
    ver={}
    for l in open("C:/temp/cafes/audit/verify_full.jsonl",encoding="utf-8"):
        try: r=json.loads(l)
        except Exception: continue
        ver[r["id"]]=r
    out={}; cnt=collections.Counter(); samp={"drop":[],"keep":[]}
    for i,c in data.items():
        if not RESTAURANT(c.get("cat")): continue
        ctxs=[]
        for p in (ver.get(i) or {}).get("pages",[]):
            ctxs+= (p.get("ctx") or [])
        for e in c.get("ev") or []: ctxs+= e.get("s") or []
        ok=any(drink_ctx(x) for x in ctxs) or bool(c.get("focus")) or bool(re.search("matcha|抹茶|말차",c["name"],re.I)) or bool(c.get("via"))
        out[i]=ok; cnt[(c["cc"] if c["cc"] in("JP","US","GB") else "other",ok)]+=1
        k="keep" if ok else "drop"
        if len(samp[k])<14 and hash(i)%11==0: samp[k].append((c["name"],c["cat"],next((x[:110] for x in ctxs if M.search(x)),"")))
    print(len(out),"restaurant-type venues;","qualify:",sum(out.values()),"fail:",len(out)-sum(out.values()))
    print(sorted(cnt.items()))
    for k in samp:
        print("==",k)
        for s in samp[k]: print("  ",s[0][:30],"|",s[2].replace("\n"," "))
    json.dump(out,open("C:/temp/cafes/audit/restaurant_check.json","w"))
