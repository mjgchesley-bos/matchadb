import sqlite3, json, re, sys
sys.stdout.reconfigure(encoding="utf-8")
c = sqlite3.connect("C:/Users/mjgch/projects/matchadb/data/matcha.db")
names = [r[0] for r in c.execute("select name from brands order by name")]
GENERIC = {"365", "Dona", "Legion", "Leopard", "Rya", "Tradition", "UnD", "Encha", "Golde", "Heapwell", "Matcha.com", "Green Foods", "Wild Foods", "Ikkyu", "Kenko Tea",
           "Tsujiki", "OMGTea", "Tezumi", "KAJU", "Ooika", "Nio Teas", "Grin Mood", "Culinary Teas", "Chaism", "Blue Bottle", "Pique Tea", "Kirkland Signature", "Trader Joe's",
           "Matcha Crew", "Matcha Moon", "Matcha Ninja", "Matcha Nude", "Matcha Sense", "Matcha Maiden", "Matcha Outlet", "Distinctly Organic", "Mighty Leaf", "Navitas Organics",
           "Premium Health Japan", "Kiss Me Organics", "Whisk Matcha", "Moocha Matcha", "Howdy Matcha", "Gotcha Matcha", "Funky Matcha", "Epic Matcha", "Breakaway Matcha", "Rokubei", "Ujido", "Dona"}
ALIAS = {  # extra spellings, including Japanese names
    "Ippodo": ["一保堂"], "Marukyu Koyamaen": ["丸久小山園", "Marukyu"], "Nakamura Tokichi": ["中村藤吉", "Tokichi"], "Gion Tsujiri": ["祇園辻利", "Tsujiri"],
    "Fukujuen": ["福寿園"], "Ito En": ["伊藤園", "Itoen"], "Hoshino Seichaen": ["星野製茶園"], "Kanbayashi Shunsho": ["上林春松"], "Horii Shichimeien": ["堀井七茗園"],
    "Yamamasa Koyamaen": ["山政小山園"], "Morihan": ["森半"], "Aiya": ["アイヤ"], "Kusmi Tea": ["Kusmi"], "Palais des Thés": ["Palais des Thes"], "Teapigs": ["tea pigs"],
    "David's Tea": ["DAVIDsTEA", "DAVID'S TEA", "Davids Tea"], "Harney & Sons": ["Harney and Sons"], "Matcha Konomi": ["Konomi"], "Yamamotoyama": ["山本山"],
}
ACC = {"ō": "[oō]", "Ō": "[oō]", "ū": "[uū]", "é": "[eé]", "ô": "[oô]", "ï": "[iï]"}

def pat(n):
    out = ""
    for ch in n:
        if ch in ACC: out += ACC[ch]
        elif ch == "&": out += r"(?:&|&amp;|and)"
        elif ch == " ": out += r"\s+"
        elif ch in ".'’-": out += r"[.'’-]?"
        else: out += re.escape(ch)
    return r"\b" + out + r"\b"

brands = []
for n in names:
    if n in GENERIC or len(n) <= 3: continue
    parts = [pat(n)]
    for a in ALIAS.get(n, []):
        parts.append(re.escape(a) if re.search(r"[^\x00-\x7f]", a) else pat(a))
    brands.append({"name": n, "pattern": "|".join(parts)})
for n in ["Ippodo", "Aiya", "Ito En"]:
    pass
print(len(brands), "brand patterns")
json.dump(brands, open("C:/temp/cafes/brands.json", "w", encoding="utf-8"), ensure_ascii=False)
