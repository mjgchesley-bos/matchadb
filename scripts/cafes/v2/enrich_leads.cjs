// For lead websites (domains that look matcha-related): find out whether it is a physical venue and where.
// Reads the site's own schema.org JSON-LD (LocalBusiness / CafeOrCoffeeShop / Restaurant ... with PostalAddress),
// then falls back to a street address printed on the page. Honest UA, robots honoured.
// Usage: node enrich_leads.cjs leads.json out.jsonl [concurrency]
const fs = require("fs");
const [leadsFile, outFile, conc = "100"] = process.argv.slice(2);
const UA = "MatchaDBBot/1.0 (+https://www.matchadb.com; checks whether cafes list matcha on their own site)";
const leads = JSON.parse(fs.readFileSync(leadsFile, "utf8"));
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, "utf8").split("\n")) if (l) { try { done.add(JSON.parse(l).host); } catch {} }
const todo = leads.filter((h) => !done.has(h.host));
console.log(`leads ${leads.length}, done ${done.size}, todo ${todo.length}`);
const out = fs.createWriteStream(outFile, { flags: "a" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, ms = 12000) {
  for (let i = 0; i < 4; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.5" }, redirect: "follow", signal: ctl.signal });
      const ct = r.headers.get("content-type") || "";
      if (r.status === 429 || r.status >= 500) { await sleep(4000 * (i + 1) * (1 + Math.random())); continue; }
      if (!r.ok || !/html|xml|text/.test(ct)) return { status: r.status, body: "", url: r.url };
      const body = (await r.text()).slice(0, 1_500_000);
      return { status: r.status, body, url: r.url };
    } catch (e) {
      if (i === 3) return { status: 0, body: "", url, err: String(e.name || e).slice(0, 30) };
    } finally { clearTimeout(t); }
  }
  return { status: 0, body: "", url };
}
function robotsOk(txt, path) {
  let applies = false, prev = false; const rules = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim(); const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { const hit = v === "*" || /matchadb/i.test(v); applies = prev ? applies || hit : hit; prev = true; }
    else { prev = false; if (applies && k === "disallow" && v) rules.push(v); }
  }
  return !rules.some((r) => { const end = r.endsWith("$"); const b = (end ? r.slice(0, -1) : r).split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*"); return new RegExp("^" + b + (end ? "$" : "")).test(path); });
}
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const textOf = (h) => decode(h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

function jsonld(html) {
  const nodes = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const walk = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    nodes.push(x);
    if (x["@graph"]) walk(x["@graph"]);
    for (const k of ["location", "department", "subOrganization", "hasPart", "mainEntity"]) if (x[k]) walk(x[k]);
  };
  while ((m = re.exec(html))) { try { walk(JSON.parse(m[1].trim())); } catch {} }
  const res = [];
  for (const n of nodes) {
    const addr = n.address && (Array.isArray(n.address) ? n.address[0] : n.address);
    const t = [].concat(n["@type"] || []).join(",");
    if (!addr || typeof addr !== "object" || !(addr.streetAddress || addr.postalCode)) continue;
    res.push({
      types: t, name: typeof n.name === "string" ? n.name : null, street: addr.streetAddress || null, locality: addr.addressLocality || null,
      region: typeof addr.addressRegion === "string" ? addr.addressRegion : addr.addressRegion?.name || null, postal: addr.postalCode || null,
      country: typeof addr.addressCountry === "string" ? addr.addressCountry : addr.addressCountry?.name || null, tel: n.telephone || null,
      lat: n.geo?.latitude ?? null, lng: n.geo?.longitude ?? null, hasMenu: !!n.hasMenu || !!n.servesCuisine,
    });
  }
  return res;
}
const ST = "AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";
const US_ADDR = new RegExp(`\\b(\\d{1,6}\\s+(?:[NSEW]\\.?\\s+)?[A-Z0-9][\\w.'#&-]*(?:\\s+[\\w.'#&-]+){0,4}?\\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pkwy|Parkway|Pl|Place|Ct|Court|Hwy|Highway|Sq|Square|Ter|Terrace|Cir|Circle)\\b\\.?(?:,?\\s*(?:Suite|Ste|Unit|#)\\s*[\\w-]+)?)[,\\s]+([A-Z][A-Za-z.'-]+(?:\\s[A-Z][A-Za-z.'-]+){0,2}),?\\s+(${ST})\\.?,?\\s+(\\d{5})\\b`);

async function enrich({ host, url }) {
  const rec = { host, url, at: new Date().toISOString().slice(0, 10) };
  let origin; try { origin = new URL(url).origin; } catch { return { ...rec, status: "badurl" }; }
  const rb = await get(origin + "/robots.txt", 6000);
  if (rb.status === 200 && rb.body && !robotsOk(rb.body, "/")) return { ...rec, status: "robots" };
  const home = await get(url);
  if (!home.body) return { ...rec, status: home.status ? "http" + home.status : home.err || "fail" };
  const pages = [home];
  const base = new URL(home.url);
  const same = (u) => { try { return new URL(u).host.replace(/^www\./, "") === base.host.replace(/^www\./, ""); } catch { return false; } };
  const cands = [];
  for (const m of home.body.matchAll(/<a\b[^>]*?href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(decode(m[1]), base).href; } catch { continue; }
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (same(u) && /contact|location|visit|find[- ]us|about|hours|menu|stores?|caf[eé]/i.test(text + " " + u) && !/\.(jpe?g|png|pdf)(\?|$)/i.test(u)) cands.push(u);
  }
  for (const u of [...new Set(cands)].slice(0, 4)) { const p = await get(u, 10000); if (p.body) pages.push(p); }
  const ld = []; let textAddr = null, hasHours = false, hasMenuPage = false;
  for (const p of pages) {
    ld.push(...jsonld(p.body));
    const tx = textOf(p.body);
    if (!textAddr) { const m = tx.match(US_ADDR); if (m) textAddr = { street: m[1], locality: m[2], region: m[3], postal: m[4], src: p.url }; }
    if (/\b(hours|open daily|mon(day)?\s*[-–]|closed (on )?(mon|tue|wed|thu|fri|sat|sun))/i.test(tx)) hasHours = true;
    if (/\/menu|our menu|drink menu|the menu/i.test(p.url + " " + tx.slice(0, 3000))) hasMenuPage = true;
  }
  const title = (home.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const og = (home.body.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) || [])[1];
  return { ...rec, status: "ok", title: title ? decode(title).replace(/\s+/g, " ").trim().slice(0, 120) : null, site: og ? decode(og).slice(0, 80) : null, ld: ld.slice(0, 6), textAddr, hasHours, hasMenuPage, pages: pages.length };
}
(async () => {
  let i = 0, fin = 0, withAddr = 0;
  async function worker() {
    while (i < todo.length) {
      const h = todo[i++]; let r;
      try { r = await enrich(h); } catch (e) { r = { host: h.host, url: h.url, status: "error", err: String(e).slice(0, 80) }; }
      out.write(JSON.stringify(r) + "\n"); fin++;
      if (r.ld?.length || r.textAddr) withAddr++;
      if (fin % 200 === 0) console.log(`${fin}/${todo.length} with address ${withAddr}`);
    }
  }
  await Promise.all(Array.from({ length: +conc }, worker));
  out.end(); console.log(`DONE ${fin} with address ${withAddr}`);
})();
