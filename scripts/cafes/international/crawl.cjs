// Menu check: for each cafe website, look on the cafe's OWN site for the word "matcha"
// (homepage + up to 4 menu/drinks/order pages). Resumable; appends one JSON line per host.
// Usage: node crawl.cjs hosts.json out.jsonl [concurrency] [limit]
const fs = require("fs");
const [hostsFile, outFile, conc = "64", limit = "0"] = process.argv.slice(2);
const UA = "MatchaDBBot/1.0 (+https://www.matchadb.com; checks whether cafes list matcha on their own site)";
let hosts = JSON.parse(fs.readFileSync(hostsFile, "utf8")); // [{host, url}]
if (+limit) hosts = hosts.slice(0, +limit);
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, "utf8").split("\n")) if (l) { try { done.add(JSON.parse(l).host); } catch {} }
const todo = hosts.filter((h) => !done.has(h.host));
console.log(`hosts ${hosts.length}, already done ${done.size}, to do ${todo.length}`);
const out = fs.createWriteStream(outFile, { flags: "a" });

const M_SRC = String.raw`(?:\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차)`;
const M_TEST = new RegExp(M_SRC, "i");
const M_ALL = new RegExp(M_SRC, "gi");
const MENU_RE = /menu|drink|beverage|order|food|eat|coffee|tea|shop|specials|carte|speisekarte|getr[aä]nke|bebidas|carta|bevande|boissons|メニュー|ドリンク|お品書き|飲み物|메뉴|음료/i;
const MENU_PATH = /menu|drinks?|beverages?|carte|speisekarte|getr[aä]nke|bebidas|carta|bevande|boissons|メニュー|ドリンク|메뉴|음료/i;
const PLATFORMS = /toasttab\.com|square\.site|squareup\.com|clover\.com|olo\.com|chownow\.com|order\.online|ordering\.|menus?\./i;

async function get(url, ms = 12000, max = 1_500_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/pdf;q=0.5,*/*;q=0.1", "Accept-Language": "en;q=0.9,ja;q=0.8,ko;q=0.8,de;q=0.7,fr;q=0.7,it;q=0.7,es;q=0.7,*;q=0.5" }, redirect: "follow", signal: ctl.signal });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok) return { status: r.status, url: r.url, ct, body: "" };
    if (!/text\/html|text\/plain|xml/.test(ct)) return { status: r.status, url: r.url, ct, body: "" };
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
    return { status: r.status, url: r.url, ct, body: Buffer.concat(chunks).toString("utf8") };
  } catch (e) {
    return { status: 0, url, ct: "", body: "", err: String(e.name || e).slice(0, 40) };
  } finally {
    clearTimeout(t);
  }
}

function safeDecode(x) {
  try {
    return decodeURIComponent(x);
  } catch {
    return x;
  }
}

function robotsAllows(txt, path) {
  // Minimal robots.txt: honour Disallow rules (with * and $ wildcards) for "*" and for our bot name.
  let applies = false, prevUA = false;
  const rules = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      const hit = v === "*" || /matchadb/i.test(v);
      applies = prevUA ? applies || hit : hit;
      prevUA = true;
    } else {
      prevUA = false;
      if (applies && k === "disallow" && v) rules.push(v);
    }
  }
  return !rules.some((r) => {
    const endAnchor = r.endsWith("$");
    const body = (endAnchor ? r.slice(0, -1) : r).split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp("^" + body + (endAnchor ? "$" : "")).test(path);
  });
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
function textOf(html) {
  return decode(html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, " $1 ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}
function pageText(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}
function snippets(txt) {
  const out = [];
  const re = new RegExp(M_SRC, "gi");
  let m, last = -999;
  while ((m = re.exec(txt)) && out.length < 3) {
    if (m.index - last < 200) continue;
    last = m.index;
    out.push(txt.slice(Math.max(0, m.index - 70), m.index + 90).trim());
  }
  return out;
}
function links(html, base) {
  const res = [];
  const re = /<a\b[^>]*?href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && res.length < 200) {
    let u;
    try { u = new URL(decode(m[1]), base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    res.push({ url: u.href, text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) });
  }
  return res;
}

async function check({ host, url }) {
  const rec = { host, url, at: new Date().toISOString().slice(0, 10) };
  let origin;
  try { origin = new URL(url).origin; } catch { return { ...rec, status: "badurl" }; }
  const rb = await get(origin + "/robots.txt", 6000, 200_000);
  if (rb.status === 200 && rb.body && !robotsAllows(rb.body, "/")) return { ...rec, status: "robots" };
  const home = await get(url);
  if (!home.body) return { ...rec, status: home.status ? "http" + home.status : home.err || "fail" };
  const pages = [{ url: home.url, kind: "home", html: home.body }];
  const base = home.url;
  const sameHost = (u) => { try { return new URL(u).host.replace(/^www\./, "") === new URL(base).host.replace(/^www\./, ""); } catch { return false; } };
  const cand = [];
  const seen = new Set([base.replace(/\/$/, "")]);
  let platform = null, pdf = null;
  for (const l of links(home.body, base)) {
    const key = l.url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    if (/\.pdf(\?|$)/i.test(l.url) && MENU_RE.test(l.url + " " + l.text)) { pdf ??= l.url; continue; }
    if (PLATFORMS.test(l.url) && !platform) platform = l.url;
    const ok = (sameHost(l.url) || PLATFORMS.test(l.url)) && (MENU_RE.test(l.text) || MENU_PATH.test(safeDecode(new URL(l.url).pathname)));
    if (!ok || /\/(cart|account|login|gift|careers|jobs|privacy|terms|catering)\b/i.test(l.url)) continue;
    seen.add(key);
    const strong = MENU_PATH.test(l.text + " " + safeDecode(new URL(l.url).pathname));
    cand.push({ ...l, strong });
  }
  cand.sort((a, b) => b.strong - a.strong);
  for (const c of cand.slice(0, 4)) {
    if (rb.status === 200 && rb.body && sameHost(c.url) && !robotsAllows(rb.body, new URL(c.url).pathname)) continue;
    const p = await get(c.url, 10000);
    if (p.body) pages.push({ url: p.url, kind: MENU_PATH.test(safeDecode(c.url) + " " + c.text) || /order/i.test(c.url) ? "menu" : "other", html: p.body });
  }
  const hits = [];
  for (const p of pages) {
    const raw = p.html;
    if (!M_TEST.test(raw)) continue;
    const vis = pageText(raw);
    const inVisible = M_TEST.test(vis);
    const sn = snippets(inVisible ? vis : textOf(raw));
    const count = (vis.match(M_ALL) || []).length;
    hits.push({ url: p.url, kind: p.kind, visible: inVisible, count, snippets: sn });
  }
  return { ...rec, status: "ok", pages: pages.length, matcha: hits.length > 0, hits, platform, pdf };
}

(async () => {
  let i = 0, ok = 0, matcha = 0, fin = 0;
  const t0 = Date.now();
  async function worker() {
    while (i < todo.length) {
      const h = todo[i++];
      let r;
      try { r = await check(h); } catch (e) { r = { host: h.host, url: h.url, status: "error", err: String(e).slice(0, 80) }; }
      out.write(JSON.stringify(r) + "\n");
      fin++;
      if (r.status === "ok") ok++;
      if (r.matcha) matcha++;
      if (fin % 500 === 0) console.log(`${fin}/${todo.length} ok ${ok} matcha ${matcha} ${(((Date.now() - t0) / 1000) | 0)}s`);
    }
  }
  await Promise.all(Array.from({ length: +conc }, worker));
  out.end();
  console.log(`DONE ${fin} ok ${ok} matcha ${matcha}`);
})();
