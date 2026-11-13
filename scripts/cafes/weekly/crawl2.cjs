// Menu check v2: deeper discovery than crawl.cjs.
// For each site: homepage + nav links, then (if no matcha yet) sitemap.xml menu/location pages, then common menu paths.
// Retries 429/5xx with backoff, and tries www/scheme variants when the first fetch cannot connect.
// Honest UA, robots.txt honoured (incl. wildcards), polite per-host delay.
// Usage: node crawl2.cjs hosts.json out.jsonl [concurrency] [limit]
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

// matcha in English, Japanese (kanji, hiragana, katakana) and Korean — written as escapes so the file encoding can never break it
const M_SRC = String.raw`(?:\bmatchas?\b|\bmaccha\b|抹茶|まっちゃ|マッチャ|말차)`;
const M_TEST = new RegExp(M_SRC, "i");
const M_ALL = new RegExp(M_SRC, "gi");
const MENU_WORDS = String.raw`menu|drink|beverage|order|food|eat|coffee|tea|shop|special|carte|speisekarte|getr[aä]nke|bebidas|carta|bevande|boissons|メニュー|ドリンク|お品書き|飲み物|메뉴|음료`;
const MENU_RE = new RegExp(MENU_WORDS, "i");
const MENU_PATH = new RegExp(String.raw`menu|drinks?|beverages?|carte|speisekarte|getr[aä]nke|bebidas|carta|bevande|boissons|メニュー|ドリンク|메뉴|음료`, "i");
const LOC_RE = /locations?|visit|find[- ]us|our[- ](caf[eé]s?|shops?|stores?)|caf[eé]s?|stores?|店舗|アクセス|매장/i;
const SITEMAP_RE = new RegExp(`(${MENU_WORDS}|location|visit|cafe|caf\\u00e9|store|shop|matcha|tea|seasonal|specials?|about)`, "i");
const PLATFORMS = /toasttab\.com|square\.site|squareup\.com|clover\.com|olo\.com|chownow\.com|order\.online|ordering\.|menus?\./i;
const PROBE_PATHS = ["/menu", "/menus", "/our-menu", "/drinks", "/drink-menu", "/food-and-drink", "/food-drink", "/beverages", "/coffee", "/order", "/shop", "/pages/menu", "/pages/drinks"];
const SKIP_URL = /[\/_-](cart|account|login|gift|careers|jobs|privacy|terms|policies|catering|blog|press|news|wholesale|franchise|investors?)\b|\.(jpe?g|png|gif|webp|svg|css|js|zip|mp4)(\?|$)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getOnce(url, ms, max) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.1", "Accept-Language": "en;q=0.9,ja;q=0.8,ko;q=0.8,de;q=0.7,fr;q=0.7,it;q=0.7,es;q=0.7,*;q=0.5" }, redirect: "follow", signal: ctl.signal });
    const ct = r.headers.get("content-type") || "";
    const ra = +r.headers.get("retry-after") || 0;
    if (!r.ok) return { status: r.status, url: r.url, ct, body: "", ra };
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
// retries: 429 / 5xx / timeouts get up to two more tries with backoff (Retry-After honoured up to 12 s)
async function get(url, ms = 12000, max = 1_500_000) {
  let r = await getOnce(url, ms, max);
  for (let i = 0; i < 2 && (r.status === 429 || r.status >= 500 || r.err === "AbortError"); i++) {
    await sleep(Math.min(12000, (r.ra || 0) * 1000 || 2500 * (i + 1) * (1 + Math.random())));
    r = await getOnce(url, ms, max);
  }
  return r;
}
const safeDecode = (x) => { try { return decodeURIComponent(x); } catch { return x; } };
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const textOf = (html) => decode(html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, " $1 ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const pageText = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
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
  const re = /<a\b[^>]{0,600}?href=["']([^"'#]+)["'][^>]{0,600}>([\s\S]{0,400}?)<\/a>/gi;   // bounded: an unclosed <a in a huge page made the old pattern rescan the whole page for every <a (a CPU hang)
  let m;
  while ((m = re.exec(html)) && res.length < 300) {
    let u;
    try { u = new URL(decode(m[1]), base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    res.push({ url: u.href, text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) });
  }
  return res;
}
function robotsParse(txt) {
  let applies = false, prevUA = false;
  const rules = [], sitemaps = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "sitemap") sitemaps.push(v);
    else if (k === "user-agent") {
      const hit = v === "*" || /matchadb/i.test(v);
      applies = prevUA ? applies || hit : hit;
      prevUA = true;
    } else {
      prevUA = false;
      if (applies && k === "disallow" && v) rules.push(v);
    }
  }
  return { rules, sitemaps };
}
const allowed = (rules, path) => !rules.some((r) => {
  const endAnchor = r.endsWith("$");
  const body = (endAnchor ? r.slice(0, -1) : r).split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp("^" + body + (endAnchor ? "$" : "")).test(path);
});

async function homeWithVariants(url) {
  let h = await get(url);
  if (h.body || (h.status && h.status !== 0 && h.status < 500 && h.status !== 429)) return h;
  if (h.status === 0 || h.status === 429 || h.status >= 500) {
    let u; try { u = new URL(url); } catch { return h; }
    const variants = [];
    const bare = u.host.replace(/^www\./, "");
    variants.push(`https://${u.host.startsWith("www.") ? bare : "www." + bare}${u.pathname}`);
    if (u.protocol === "https:") variants.push(`http://${u.host}${u.pathname}`);
    for (const v of variants) {
      if (h.status === 429) break; // rate-limited hosts: backoff already tried, do not hammer other variants
      const r = await getOnce(v, 10000, 1_500_000);
      if (r.body) return r;
    }
  }
  return h;
}

async function check({ host, url }) {
  const rec = { host, url, at: new Date().toISOString().slice(0, 10), v: 2 };
  const T0 = Date.now();
  const late = () => Date.now() - T0 > 70000;
  let origin;
  try { origin = new URL(url).origin; } catch { return { ...rec, status: "badurl" }; }
  const rb = await get(origin + "/robots.txt", 6000, 200_000);
  const rp = rb.status === 200 && rb.body ? robotsParse(rb.body) : { rules: [], sitemaps: [] };
  if (!allowed(rp.rules, "/")) return { ...rec, status: "robots" };
  const home = await homeWithVariants(url);
  if (!home.body) return { ...rec, status: home.status ? "http" + home.status : home.err || "fail" };
  const pages = [{ url: home.url, kind: "home", html: home.body }];
  const base = home.url;
  const baseHost = new URL(base).host.replace(/^www\./, "");
  const sameHost = (u) => { try { return new URL(u).host.replace(/^www\./, "") === baseHost; } catch { return false; } };
  const seen = new Set([base.replace(/\/$/, "")]);
  let platform = null, pdf = null, via = "home";
  const robotsOk = (u) => { try { return !sameHost(u) || allowed(rp.rules, new URL(u).pathname); } catch { return false; } };
  const fetchPage = async (u, kind) => {
    const key = u.replace(/\/$/, "");
    if (seen.has(key) || !robotsOk(u) || late()) return null;
    seen.add(key);
    await sleep(150 + Math.random() * 200);
    const p = await get(u, 10000);
    if (p.body) { const pg = { url: p.url, kind, html: p.body }; pages.push(pg); return pg; }
    return null;
  };
  const hit = () => pages.some((p) => M_TEST.test(p.html));

  // 1. menu-ish links from the homepage
  const cand = [];
  for (const l of links(home.body, base)) {
    if (/\.pdf(\?|$)/i.test(l.url) && MENU_RE.test(l.url + " " + l.text)) { pdf ??= l.url; continue; }
    if (PLATFORMS.test(l.url) && !platform) platform = l.url;
    if (SKIP_URL.test(l.url)) continue;
    let path; try { path = safeDecode(new URL(l.url).pathname); } catch { continue; }
    const ok = (sameHost(l.url) || PLATFORMS.test(l.url)) && (MENU_RE.test(l.text) || MENU_PATH.test(path));
    if (!ok) continue;
    cand.push({ ...l, strong: MENU_PATH.test(l.text + " " + path) });
  }
  cand.sort((a, b) => b.strong - a.strong);
  let n = 0;
  for (const c of cand) {
    if (n >= 5) break;
    if (await fetchPage(c.url, MENU_PATH.test(safeDecode(c.url) + " " + c.text) || /order/i.test(c.url) ? "menu" : "other")) n++;
  }

  // 1b. multi-location sites: follow the Locations / Cafes index, then its sibling location pages (stop at first matcha hit)
  if (!hit()) {
    const locs = links(home.body, base).filter((l) => sameHost(l.url) && !SKIP_URL.test(l.url) && LOC_RE.test(l.text + " " + safeDecode(new URL(l.url).pathname)));
    const seenL = new Set();
    let idx = 0;
    for (const l of locs) {
      if (idx >= 2 || late()) break;
      const k0 = l.url.replace(/\/$/, "");
      if (seenL.has(k0)) continue;
      seenL.add(k0);
      const pg = await fetchPage(l.url, "other");
      if (!pg) continue;
      idx++;
      if (hit()) break;
      const seg = new URL(pg.url).pathname.split("/").filter(Boolean)[0] || "";
      const sibs = links(pg.html, pg.url).filter((x) => sameHost(x.url) && !SKIP_URL.test(x.url) && !/\/(products?|collections?|blogs?|posts?)\//i.test(x.url) && (new URL(x.url).pathname.split("/").filter(Boolean)[0] || "") === seg && new URL(x.url).pathname.split("/").filter(Boolean).length >= 1 && x.url.replace(/\/$/, "") !== k0);
      let c = 0;
      for (const x of sibs) { if (c >= 10 || late()) break; if (await fetchPage(x.url, "other")) { c++; if (hit()) break; } }
      if (hit()) { via = "locations"; break; }
    }
  }

  // 2. nothing yet: sitemap.xml (and robots Sitemap: lines) for menu / location / drink pages
  if (!hit()) {
    const smUrls = rp.sitemaps.length ? rp.sitemaps.slice(0, 2) : [origin + "/sitemap.xml"];
    const found = [];
    const collect = async (u, depth) => {
      const s = await getOnce(u, 8000, 1_500_000);
      if (!s.body) return;
      const locs = [...s.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]));
      if (/<sitemapindex/i.test(s.body) && depth < 1) {
        const subs = locs.filter((x) => /page|local|location|menu|product|post|cafe|store/i.test(x)).slice(0, 4);
        for (const sub of subs.length ? subs : locs.slice(0, 2)) await collect(sub, depth + 1);
      } else for (const x of locs) found.push(x);
    };
    for (const u of smUrls) await collect(u, 0);
    if (found.length) {
      via = "sitemap";
      // rank: menu/drink words first, then location pages, then short top-level pages (small business sites are small); skip products/posts
      const rank = (x) => {
        const path = safeDecode(new URL(x).pathname);
        const depth = path.split("/").filter(Boolean).length;
        if (MENU_PATH.test(path)) return 0;
        if (/matcha|tea|coffee|seasonal|special/i.test(path)) return 1;
        if (LOC_RE.test(path) || /\/(pages|locations?|cafes?|stores?|shops?)\//i.test(path)) return 2;
        return depth <= 1 ? 3 : 9;
      };
      const pick = found.filter((x) => { try { return sameHost(x) && !SKIP_URL.test(x) && !/\/(products?|collections?|blogs?|posts?|tags?|category|author)\//i.test(x); } catch { return false; } });
      pick.sort((a, b) => rank(a) - rank(b));
      let k = 0;
      for (const x of pick) { if (k >= 8 || rank(x) > 3) break; if (await fetchPage(x, MENU_PATH.test(safeDecode(x)) ? "menu" : "other")) k++; }
    }
  }

  // 3. still nothing and only a thin look so far: probe the usual menu paths
  if (!hit() && pages.length <= 2) {
    via = "probe";
    let got = 0;
    for (const p of PROBE_PATHS) {
      if (got >= 3) break;
      const u = origin + p;
      if (await fetchPage(u, "menu")) got++;
    }
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
  return { ...rec, status: "ok", pages: pages.length, matcha: hits.length > 0, hits, platform, pdf, via };
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
