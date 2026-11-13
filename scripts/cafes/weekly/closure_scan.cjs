// Closure scan: is this venue's own website telling visitors it has closed, moved, or been replaced?
// For each {id, url}: fetch the homepage (robots.txt honoured, honest bot name, polite delay) and record
//   status      ok | http404 | http410 | http5xx | dns | timeout | robots | other
//   redirected  final host differs from the listed host (ignoring www and language/regional subdomains)
//   parked      domain-for-sale / default server page / account suspended
//   strong      permanent-closure wording ("permanently closed", 閉店しました, zamknięte na stałe ...)
//   weak        moved / temporary / reopening / "coming soon" wording
//   title       page <title> (first 120 chars)
// Usage: node closure_scan.cjs in.json out.jsonl [concurrency]
const fs = require("fs");
const [inFile, outFile, conc = "48"] = process.argv.slice(2);
const UA = "MatchaDBBot/1.0 (+https://www.matchadb.com; checks whether listed cafes are still open)";
const items = JSON.parse(fs.readFileSync(inFile, "utf8")); // [{id, url}]
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, "utf8").split("\n")) if (l) { try { done.add(JSON.parse(l).host); } catch {} }
// one scan per host (chains share a site)
const byHost = new Map();
for (const it of items) {
  let h;
  try { h = new URL(it.url).hostname.replace(/^www\./, ""); } catch { continue; }
  if (!byHost.has(h)) byHost.set(h, it.url);
}
const todo = [...byHost.entries()].filter(([h]) => !done.has(h));
console.log(`hosts ${byHost.size}, done ${done.size}, todo ${todo.length}`);
const out = fs.createWriteStream(outFile, { flags: "a" });

const STRONG = [
  /permanently\s+closed/i, /(has|have)\s+(now\s+)?closed\s+(its|our|their)?\s*(doors|permanently|for good)?/i, /closed\s+(for\s+good|permanently)/i, /closing\s+(our\s+doors|permanently|for good)/i,
  /no\s+longer\s+(open|operating|in\s+business|serving|trading)/i, /ceased\s+(operations|trading)/i, /out\s+of\s+business/i, /final\s+day\s+of\s+(business|service)/i, /last\s+day\s+of\s+business/i, /thank\s+you\s+for\s+(\d+|all\s+the)\s+(wonderful\s+)?years/i,
  /dauerhaft\s+geschlossen/i, /endg[uü]ltig\s+geschlossen/i, /geschäftsaufgabe/i, /nicht\s+mehr\s+ge[oö]ffnet/i,
  /d[eé]finitivement\s+ferm[eé]/i, /fermeture\s+d[eé]finitive/i, /a\s+ferm[eé]\s+ses\s+portes/i,
  /cerrado\s+(definitivamente|permanentemente)/i, /cierre\s+definitivo/i, /hemos\s+cerrado/i,
  /chiuso\s+definitivamente/i, /chiusura\s+definitiva/i, /abbiamo\s+chiuso/i, /attivit[aà]\s+cessata/i,
  /definitief\s+gesloten/i, /permanent\s+gesloten/i,
  /zamkni[eę]te\s+na\s+sta[lł]e/i, /trwale\s+zamkni[eę]te/i, /zako[nń]czyli[sś]my\s+dzia[lł]alno[sś][cć]/i, /lokal\s+zamkni[eę]ty/i,
  /trvale\s+zav[rř]eno/i, /zav[rř]eno\s+nav[zž]dy/i,
  /encerr(ou|amos)\s+(as\s+)?(suas\s+|nossas\s+)?atividades/i, /fechado\s+permanentemente/i,
  /閉店(しました|いたしました|致しました|のお知らせ|となりました)/, /閉業/, /営業を?終了(しました|いたしました|致しました)/, /誠に勝手ながら.{0,20}閉店/, /店舗閉鎖/,
  /폐업/, /영업을?\s*종료/, /문을\s*닫/, /폐점/,
  /永久(停业|关闭|歇业)/, /已(经)?(停业|关门|歇业)/, /暫停營業|結束營業/,
];
const WEAK = [
  /temporarily\s+closed/i, /we(\s+have|'ve)?\s+moved/i, /(has|have)\s+moved\s+to/i, /relocat(ed|ing)\s+to/i, /now\s+(located|open)\s+at/i, /re-?open(ing)?\s+(soon|in|on)/i, /coming\s+soon/i, /under\s+construction/i, /closed\s+for\s+(renovation|the\s+season|winter|holidays)/i,
  /vor[uü]bergehend\s+geschlossen/i, /umgezogen/i, /temporairement\s+ferm[eé]/i, /nous\s+avons\s+d[eé]m[eé]nag[eé]/i, /cerrado\s+temporalmente/i, /temporaneamente\s+chiuso/i, /tijdelijk\s+gesloten/i, /czasowo\s+zamkni[eę]te/i,
  /移転(しました|いたしました|のお知らせ)/, /一時休業/, /臨時休業/, /임시\s*휴업/, /이전\s*(했|하였)/,
];
const PARKED = [/domain\s+(is\s+)?(for\s+sale|parked|expired)/i, /this\s+domain\s+(may\s+be|is)\s+for\s+sale/i, /buy\s+this\s+domain/i, /hugedomains|sedoparking|dan\.com\/buy|afternic/i, /account\s+suspended/i, /site\s+not\s+found/i, /default\s+web\s+site\s+page|apache2\s+(ubuntu\s+)?default\s+page|welcome\s+to\s+nginx|index\s+of\s+\//i, /this\s+site\s+can.?t\s+be\s+reached/i, /website\s+(is\s+)?(under\s+maintenance|expired)/i, /oferta\s+sprzeda[zż]y\s+domeny/i, /domain\s+registered\s+at/i, /wordpress\s+(coming\s+soon|maintenance)/i];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const robotsCache = new Map();
function regDomain(h) {
  const p = h.replace(/^www\./, "").split(".");
  if (p.length <= 2) return p.join(".");
  const sld = new Set(["co", "com", "org", "net", "ac", "gov", "ne", "or", "go"]);
  return (sld.has(p[p.length - 2]) && p[p.length - 1].length === 2 ? p.slice(-3) : p.slice(-2)).join(".");
}
async function f(url, ms = 12000, max = 600000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", "Accept-Language": "en,pl,de,fr,es,ja;q=0.5" }, redirect: "follow", signal: ctl.signal });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok) return { status: r.status, url: r.url, body: "" };
    if (!/text\/html|text\/plain|xml/.test(ct)) return { status: r.status, url: r.url, body: "", nonhtml: true };
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
    const m = String(e && e.cause && e.cause.code || e.name || e);
    return { status: 0, url, body: "", err: /ENOTFOUND|EAI_AGAIN/.test(m) ? "dns" : /Abort/.test(m) ? "timeout" : "other:" + m.slice(0, 30) };
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
  // linear scan: drop script/style/noscript blocks without regex backtracking
  let out = "", i = 0;
  const lower = html.toLowerCase();
  while (i < html.length && out.length < 60000) {
    const lt = html.indexOf("<", i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt) + " ";
    const m = /^<(script|style|noscript|svg)\b/.exec(lower.slice(lt, lt + 12));
    if (m) {
      const end = lower.indexOf("</" + m[1], lt);
      i = end < 0 ? html.length : lower.indexOf(">", end) + 1 || html.length;
    } else {
      const gt = html.indexOf(">", lt);
      i = gt < 0 ? html.length : gt + 1;
    }
  }
  return out.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function hits(list, text) {
  const out = [];
  for (const re of list) { const m = re.exec(text); if (m) out.push(text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 40)); if (out.length >= 3) break; }
  return out;
}
async function scan([host, url]) {
  const rec = { host, url, at: new Date().toISOString().slice(0, 10) };
  let origin;
  try { origin = new URL(url).origin; } catch { rec.status = "other"; return rec; }
  if (!(await robotsAllows(origin))) { rec.status = "robots"; return rec; }
  const r = await f(url);
  rec.final = r.url;
  if (r.err) rec.status = r.err;
  else if (r.status >= 500) rec.status = "http5xx";
  else if (r.status !== 200) rec.status = "http" + r.status;
  else rec.status = r.nonhtml ? "nonhtml" : "ok";
  try {
    const fh = new URL(r.url).hostname.replace(/^www\./, "");
    if (regDomain(fh) !== regDomain(host)) rec.redirected = fh;
  } catch {}
  if (r.body) {
    const tm = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(r.body.slice(0, 200000));
    rec.title = tm ? tm[1].replace(/\s+/g, " ").trim().slice(0, 120) : "";
    const text = visibleText(r.body);
    const head = rec.title + " " + text.slice(0, 6000);
    const strong = hits(STRONG, head), weak = hits(WEAK, head), parked = hits(PARKED, rec.title + " " + text.slice(0, 3000));
    if (strong.length) rec.strong = strong;
    if (weak.length) rec.weak = weak;
    if (parked.length) rec.parked = parked;
    rec.textLen = text.length;
    const years = [...(text.slice(-3000)).matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/gi)].map((m) => +m[1]);
    if (years.length) rec.copyright = Math.max(...years);
  }
  return rec;
}
(async () => {
  let idx = 0, n = 0;
  async function worker() {
    while (idx < todo.length) {
      const it = todo[idx++];
      let rec;
      try { rec = await scan(it); } catch (e) { rec = { host: it[0], url: it[1], status: "other:" + String(e).slice(0, 30) }; }
      out.write(JSON.stringify(rec) + "\n");
      if (++n % 500 === 0) console.log(n + " / " + todo.length);
      await sleep(80);
    }
  }
  await Promise.all(Array.from({ length: +conc }, worker));
  out.end();
  console.log("done");
})();
