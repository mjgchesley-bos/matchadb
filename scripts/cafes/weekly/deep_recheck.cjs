// Deep recheck: is matcha a DRINK this venue serves, or only a product it sells / a stray mention?
// For each site: follow the menu / drinks / order / matcha links (up to MAXP pages on the same site), find every
// "matcha" and judge its surrounding text:
//   drink   = a drink word (latte, iced, hot, oat milk, ml...) and/or a price near it, and NO powder-for-sale signal
//   retail  = near a pack weight (50 g, 100g), "add to cart", "buy now", or only on shop/product URLs
// Verdict per site: DRINK (some page shows a drink), RETAIL (matcha only as a product), NONE (no matcha found), plus ERR.
// Same politeness as crawl2: honest bot name, robots.txt honoured, per-host serial requests, short delay.
// Usage: node deep_recheck.cjs in.json out.jsonl [concurrency] [maxPages]
const fs = require("fs");
const [inFile, outFile, conc = "48", maxp = "8"] = process.argv.slice(2);
const MAXP = +maxp;
const UA = "MatchaDBBot/1.0 (+https://www.matchadb.com; checks whether listed cafes serve matcha drinks)";
const items = JSON.parse(fs.readFileSync(inFile, "utf8")); // [{id, url}]
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, "utf8").split("\n")) if (l) { try { done.add(JSON.parse(l).host); } catch {} }
const byHost = new Map();
for (const it of items) {
  let h;
  try { h = new URL(it.url).hostname.replace(/^www\./, ""); } catch { continue; }
  if (!byHost.has(h)) byHost.set(h, it.url);
}
const todo = [...byHost.entries()].filter(([h]) => !done.has(h));
console.log(`hosts ${byHost.size}, done ${done.size}, todo ${todo.length}`);
const out = fs.createWriteStream(outFile, { flags: "a" });

const M = /(?:\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차)/gi;
const DRINK = /\b(latte|lattes|iced|ice|hot|cold|drink|drinks|beverage|beverages|smoothie|lemonade|tonic|shot|oat|almond|soy|coconut|milk|cappuccino|espresso|frappe|frappuccino|boba|bubble|refresher|cortado|flat white|float|serving|served|napoj|napoje|napój|kawa|getränk|getraenk|boisson|bebida|bebidas|bevanda|ドリンク|ラテ|アイス|ホット|드링크|라떼|아이스|飲料|饮品|拿铁|奶茶)\b|ドリンク|ラテ|アイス|ホット|라떼|아이스|拿铁|奶茶|飲み物/i;
const PRICE = /(?:[$€£¥₩]\s?\d|\d\s?(?:zł|pln|kr|chf|eur|usd|円|원|元)|\b\d{1,3}[.,]\d{2}\b)/i;
const WEIGHT = /\b\d{1,4}\s?(?:g|gr|gram|grams|gramm|grammes|kg)\b|\b(?:tin|pouch|bag|tub|canister|refill|sachet|stick sticks?|pack)\b|\d+\s?(?:g|グラム)\b|入り|袋|缶/i;
const DESSERT = /(cake|cakes|cheesecake|tart|tarts|torte|tort|sernik|ciasto|ciastko|cookie|cookies|macaron|macarons|brownie|croissant|donut|doughnut|mochi|ice cream|ice-cream|gelato|sorbet|pudding|parfait|roll|cannoli|praline|pralina|chocolate|czekolada|lody|torta|tarta|kuchen|クッキー|ケーキ|アイスクリーム|ジェラート|プリン|大福|パフェ|케이크|아이스크림|蛋糕|冰淇淋)|ケーキ|クッキー|アイスクリーム|ジェラート|パフェ|大福|プリン/i;
const STRONGDRINK = /(latte|iced|hot|drink|drinks|beverage|smoothie|tonic|lemonade|boba|bubble tea|refresher|frappe|cappuccino|espresso|shot|cortado|flat white)|ラテ|ドリンク|라떼|드링크|拿铁|饮品/i;
const CART = /add to cart|add to basket|buy now|shop now|dodaj do koszyka|do koszyka|in den warenkorb|ajouter au panier|añadir al carrito|カートに|장바구니|add to bag|sold out|out of stock|wishlist|select options|wybierz opcje|\bsku\b/i;
const RETAIL_URL = /\/(products?|collections?|shop|store|stores|sklep|produkt|produkty|product-category|product_cat|kategoria-produktu|boutique|webshop|katalog|catalog|categories|category|artikel)(\/|$|\?|-)/i;
const SKIP = /[\/_-](cart|checkout|account|login|register|wishlist|privacy|terms|careers|jobs|gift|giftcard|press|investors?|franchise|contact-us|faq|returns|shipping|policies|policy|cookies|impressum|datenschutz)\b|\.(jpe?g|png|gif|webp|svg|pdf|css|js|ico|zip|mp4|mp3|woff2?)(\?|$)/i;
const PRIO = [
  [/menu|karta|carte|speisekarte|getr[aä]nke|bebidas|carta|bevande|boissons|メニュー|ドリンク|메뉴|drink|beverage|napoj|napój/i, 6],
  [/matcha|抹茶|말차/i, 4],
  [/order|zamow|zamów|bestell|commande|pedido|ordina|注文|주문|takeaway|delivery/i, 3],
  [/coffee|kawa|kaffee|caf[eé]|tea|herbat|food|special|seasonal|speisen|dania/i, 2],
  [/shop|store|sklep|product|collections?/i, 1],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const robotsCache = new Map();
async function f(url, ms = 12000, max = 700000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", "Accept-Language": "en,pl,de,fr,es,ja;q=0.5" }, redirect: "follow", signal: ctl.signal });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok) return { status: r.status, url: r.url, body: "" };
    if (!/text\/html|text\/plain|xml/.test(ct)) return { status: r.status, url: r.url, body: "" };
    const reader = r.body.getReader();
    const chunks = [];
    let n = 0;
    while (true) {
      const { done: d, value } = await reader.read();
      if (d) break;
      chunks.push(value);
      n += value.length;
      if (n > max) { try { ctl.abort(); } catch {} break; }
    }
    return { status: r.status, url: r.url, body: Buffer.concat(chunks).toString("utf8") };
  } catch (e) {
    const m = String((e && e.cause && e.cause.code) || e.name || e);
    return { status: 0, url, body: "", err: /ENOTFOUND|EAI_AGAIN/.test(m) ? "dns" : /Abort/.test(m) ? "timeout" : "other" };
  } finally {
    clearTimeout(t);
  }
}
async function robotsAllows(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const r = await f(origin + "/robots.txt", 6000, 60000);
  let ok = true;
  if (r.status === 200 && r.body) {
    let applies = false;
    for (const raw of r.body.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, "").trim();
      const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
      if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "user-agent") applies = v === "*" || /matchadb/i.test(v);
      else if (applies && k === "disallow" && v === "/") ok = false;
    }
  }
  robotsCache.set(origin, ok);
  return ok;
}
function visibleText(html) {
  let o = "", i = 0;
  const lower = html.toLowerCase();
  while (i < html.length && o.length < 120000) {
    const lt = html.indexOf("<", i);
    if (lt < 0) { o += html.slice(i); break; }
    o += html.slice(i, lt) + " ";
    const m = /^<(script|style|noscript|svg)\b/.exec(lower.slice(lt, lt + 12));
    if (m) { const end = lower.indexOf("</" + m[1], lt); i = end < 0 ? html.length : lower.indexOf(">", end) + 1 || html.length; }
    else { const gt = html.indexOf(">", lt); i = gt < 0 ? html.length : gt + 1; }
  }
  return o.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function links(html, base) {
  const out = [];
  const re = /<a\b[^>]{0,600}?href=["']([^"'#]+)["'][^>]{0,600}>([\s\S]{0,200}?)<\/a>/gi;
  let m, n = 0;
  while ((m = re.exec(html.slice(0, 500000))) && n++ < 600) {
    try { out.push({ u: new URL(m[1], base).href, t: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) }); } catch {}
  }
  return out;
}
const ITEM = /matcha\s*(?:latte|tea|green tea|lemonade|tonic|cold foam|shot|espresso|frappe|smoothie|mojito|cooler|fizz|milkshake|boba|bubble|soda|lassi|chai)|(?:iced|hot|ceremonial|strawberry|coconut|vanilla|oat|rose|blueberry|mango|lavender|honey|brown sugar|dirty|salted|pistachio)\s+matcha|(?:latte|tea|green tea)\s+matcha|matcha\s*[-–:|]?\s*(?:[$€£¥]\s?\d|\d+[.,]\d\d|\d+\s?(?:zł|pln|円|원))|抹茶(?:ラテ|オレ|ティー|ドリンク|ソーダ|フラッペ)|말차\s*(?:라떼|음료)|matcha(?:ラテ|ミルク)/i;
const NAV = /(herbat|kaw[aey]|oolong|rooibos|yerba|pu-?erh|sencha|black tea|white tea|green tea|herbal|zestaw|akcesori|sklep|collection|categories|accessor|teaware|gifts?|subscription|wholesale|blend|loose|samplers?)/gi;
function judge(text, url) {
  // each matcha context judged on its own: a real menu ITEM (drink phrase, or a price right beside it), not a navigation label or product
  const hits = { drink: [], retail: [] };
  const retailPage = RETAIL_URL.test(url);
  let m, n = 0;
  M.lastIndex = 0;
  while ((m = M.exec(text)) && n++ < 60) {
    const ctx = text.slice(Math.max(0, m.index - 70), m.index + 110);
    const near = text.slice(Math.max(0, m.index - 40), m.index + 70);
    const navWords = new Set((near.match(NAV) || []).map((x) => x.toLowerCase())).size;
    const item = ITEM.test(near);
    const dessert = DESSERT.test(near) && !STRONGDRINK.test(near);
    const retailish = WEIGHT.test(near) || (CART.test(ctx) && !STRONGDRINK.test(near)) || dessert;
    if (item && !retailish && navWords < 3 && !(retailPage && CART.test(text) && !STRONGDRINK.test(near))) { if (hits.drink.length < 2) hits.drink.push(ctx.trim()); }
    else if (retailish || retailPage || navWords >= 3) { if (hits.retail.length < 2) hits.retail.push(ctx.trim()); }
  }
  return hits;
}
async function scan([host, url]) {
  const rec = { host, url, at: new Date().toISOString().slice(0, 10), pages: 0 };
  let origin;
  try { origin = new URL(url).origin; } catch { rec.verdict = "ERR"; return rec; }
  if (!(await robotsAllows(origin))) { rec.verdict = "ERR"; rec.err = "robots"; return rec; }
  const seen = new Set(), queue = [{ u: url, s: 10 }];
  const reg = (h) => h.replace(/^www\./, "");
  let sawMatcha = false, drink = null, retail = null, firstErr = null;
  const tried = new Set(["/menu", "/menus", "/drinks", "/drink-menu", "/food-and-drink", "/order"]);
  while (queue.length && rec.pages < MAXP && !drink) {
    queue.sort((a, b) => b.s - a.s);
    const cur = queue.shift();
    if (seen.has(cur.u)) continue;
    seen.add(cur.u);
    const r = await f(cur.u);
    if (r.err && !firstErr) firstErr = r.err;
    if (!r.body) { if (rec.pages === 0 && r.status && !firstErr) firstErr = "http" + r.status; await sleep(60); continue; }
    rec.pages++;
    const text = visibleText(r.body);
    const j = judge(text, r.url);
    if (j.drink.length) drink = { url: r.url, ctx: j.drink[0] };
    else if (j.retail.length && !retail) retail = { url: r.url, ctx: j.retail[0] };
    if (j.drink.length || j.retail.length || M.test(text)) sawMatcha = true;
    M.lastIndex = 0;
    if (rec.pages === 1 && !drink) {
      // first page read: also try the usual menu paths once
      for (const p of tried) { const u = origin + p; if (!seen.has(u)) queue.push({ u, s: 7 }); }
    }
    for (const l of links(r.body, r.url)) {
      let lu;
      try { lu = new URL(l.u); } catch { continue; }
      if (reg(lu.hostname) !== reg(new URL(url).hostname) || seen.has(l.u) || SKIP.test(l.u)) continue;
      let s = 0;
      for (const [re, w] of PRIO) if (re.test(l.u) || re.test(l.t)) s += w;
      if (s > 0 && queue.length < 80) queue.push({ u: l.u, s });
    }
    await sleep(50);
  }
  if (drink) { rec.verdict = "DRINK"; rec.url = drink.url; rec.ctx = drink.ctx.slice(0, 200); }
  else if (retail) { rec.verdict = "RETAIL"; rec.url = retail.url; rec.ctx = retail.ctx.slice(0, 200); }
  else if (rec.pages === 0) { rec.verdict = "ERR"; rec.err = firstErr || "unreachable"; }
  else { rec.verdict = "NONE"; }
  return rec;
}
(async () => {
  let idx = 0, n = 0;
  async function worker() {
    while (idx < todo.length) {
      const it = todo[idx++];
      let rec;
      try { rec = await scan(it); } catch (e) { rec = { host: it[0], url: it[1], verdict: "ERR", err: String(e).slice(0, 40) }; }
      out.write(JSON.stringify(rec) + "\n");
      if (++n % 250 === 0) console.log(n + " / " + todo.length);
    }
  }
  await Promise.all(Array.from({ length: +conc }, worker));
  out.end();
  console.log("done");
})();
