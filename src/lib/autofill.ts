// Reads what a café has already published about itself (its own website) and turns it into suggestions for the owner's page editor: opening hours,
// phone, email, social links, ordering and reservation links, a description and a few "what you offer" tags. Pure functions, no network: the API route
// fetches the pages and hands the HTML here. Nothing is guessed; a field is only suggested when the site says it outright.
import { AMENITIES, type OwnerPage } from "@/lib/cafe-owner-page";

export type Suggestions = Partial<Pick<OwnerPage, "tagline" | "bio" | "phone" | "public_email" | "website_url" | "order_url" | "reservation_url">> & {
  hours?: Record<string, string>;
  links?: Record<string, string>;
  amenities?: string[];
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES: Record<string, string> = { sunday: "sun", monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat" };
const SHORT: Record<string, string> = { su: "sun", mo: "mon", tu: "tue", we: "wed", th: "thu", fr: "fri", sa: "sat" };

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8217;/g, "’").replace(/&#x27;/g, "'");

function clock(t: string): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2];
  if (h > 24) return null;
  const hh = h % 24;
  const suffix = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${min === "00" ? "" : `:${min}`}${suffix}`;
}
const mins = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t.trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : -1; };
function span(open: string, close: string): string | null {
  if (/^0?0:00/.test(open) && /^(23:59|24:00)/.test(close)) return "Open 24 hours";
  const a = clock(open), b = clock(close);
  return a && b ? `${a} to ${b}` : null;
}

function jsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(decode(m[1]).trim());
      const walk = (x: unknown) => {
        if (Array.isArray(x)) x.forEach(walk);
        else if (x && typeof x === "object") {
          out.push(x);
          const g = (x as Record<string, unknown>)["@graph"];
          if (g) walk(g);
        }
      };
      walk(v);
    } catch { /* ignore malformed blocks */ }
  }
  return out;
}

function hoursOfNode(nodes: unknown[]): Record<string, string> {
  const acc: Record<string, string[]> = {};
  const iv: Record<string, [number, number][]> = {};
  let overlap = false;
  const add = (day: string | undefined, text: string | null, o?: string, c?: string) => {
    if (!day || !text) return;
    if (o && c) {
      const a = mins(o), b = mins(c);
      (iv[day] ??= []);
      // Overlapping intervals on one day mean the data mixes two businesses (e.g. a café and a salon): not a split shift.
      if (iv[day].some(([x, y]) => a < y && x < b)) overlap = true;
      iv[day].push([a, b]);
    }
    (acc[day] ??= []);
    if (!acc[day].includes(text)) acc[day].push(text);
  };
  for (const n of nodes as Record<string, unknown>[]) {
    const spec = n.openingHoursSpecification;
    for (const s of (Array.isArray(spec) ? spec : spec ? [spec] : []) as Record<string, unknown>[]) {
      const days = Array.isArray(s.dayOfWeek) ? s.dayOfWeek : s.dayOfWeek ? [s.dayOfWeek] : [];
      for (const d of days) {
        const key = DAY_NAMES[String(d).split("/").pop()!.toLowerCase()];
        add(key, typeof s.opens === "string" && typeof s.closes === "string" ? span(s.opens, s.closes) : null, String(s.opens), String(s.closes));
      }
    }
    const oh = n.openingHours;
    for (const line of (Array.isArray(oh) ? oh : oh ? [oh] : []) as string[]) {
      const m = /^([A-Za-z]{2})(?:\s*-\s*([A-Za-z]{2}))?(?:\s*,\s*([A-Za-z]{2}))*\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(String(line).trim());
      if (!m) continue;
      const a = SHORT[m[1].toLowerCase()], b = m[2] ? SHORT[m[2].toLowerCase()] : a;
      if (!a || !b) continue;
      const text = span(m[4], m[5]);
      let i = DAY_KEYS.indexOf(a);
      for (let guard = 0; guard < 7; guard++) {
        add(DAY_KEYS[i], text, m[4], m[5]);
        if (DAY_KEYS[i] === b) break;
        i = (i + 1) % 7;
      }
    }
  }
  const out: Record<string, string> = {};
  if (overlap) return out;
  for (const [k, v] of Object.entries(acc)) if (v.length) out[k] = v.join(", ").slice(0, 40);
  return out;
}

const SOCIAL: [string, RegExp, (m: RegExpExecArray) => string | null][] = [
  ["instagram", /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/i, (m) => (/^(p|reel|reels|explore|accounts|stories|tv|share)$/i.test(m[1]) ? null : `https://instagram.com/${m[1]}`)],
  ["facebook", /^https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)([^/?#\s]{2,80})\/?(?:[?#].*)?$/i, (m) => `https://facebook.com/${m[1]}`],
  ["tiktok", /^https?:\/\/(?:www\.)?tiktok\.com\/(@[A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/i, (m) => `https://tiktok.com/${m[1]}`],
  ["youtube", /^https?:\/\/(?:www\.)?youtube\.com\/((?:@|channel\/|c\/|user\/)[A-Za-z0-9._-]{2,60})\/?(?:[?#].*)?$/i, (m) => `https://youtube.com/${m[1]}`],
  ["x", /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(?!intent|share|home|i\/)([A-Za-z0-9_]{2,20})\/?(?:[?#].*)?$/i, (m) => `https://x.com/${m[1]}`],
  ["threads", /^https?:\/\/(?:www\.)?threads\.net\/(@[A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/i, (m) => `https://threads.net/${m[1]}`],
  ["pinterest", /^https?:\/\/(?:www\.)?pinterest\.[a-z.]+\/([A-Za-z0-9_]{2,40})\/?(?:[?#].*)?$/i, (m) => `https://pinterest.com/${m[1]}`],
  ["yelp", /^https?:\/\/(?:www\.)?yelp\.[a-z.]+\/biz\/([A-Za-z0-9%_-]{3,100})\/?(?:[?#].*)?$/i, (m) => `https://yelp.com/biz/${m[1]}`],
  ["linkedin", /^https?:\/\/(?:www\.)?linkedin\.com\/company\/([A-Za-z0-9_-]{2,80})\/?(?:[?#].*)?$/i, (m) => `https://linkedin.com/company/${m[1]}`],
  ["spotify", /^(https?:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]{10,30})(?:[?#].*)?$/i, (m) => m[1]],
  ["google_maps", /^(https?:\/\/(?:maps\.app\.goo\.gl\/[A-Za-z0-9]{6,30}|(?:www\.)?google\.com\/maps\/place\/[^\s"']{5,300}|g\.page\/[A-Za-z0-9_/-]{3,60}))/i, (m) => { const u = m[1].split("?")[0]; return u.length <= 200 ? u : null; }],
];
const ORDER = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:toasttab\.com|order\.online|square\.site|squareup\.com|clover\.com|chownow\.com|olo\.com|ordering\.[a-z.]+|order\.[a-z0-9-]+\.[a-z]+|ubereats\.com|doordash\.com|grubhub\.com|slicelife\.com|gloriafood\.com)\//i;
const RESERVE = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:opentable\.com|resy\.com|exploretock\.com|sevenrooms\.com|tablein\.com|thefork\.[a-z]+|bookatable\.com|yelp\.com\/reservations)\//i;

const KEYWORDS: [RegExp, (typeof AMENITIES)[number]][] = [
  [/\bceremonial[- ]grade\b|\bceremonial matcha\b/i, "Ceremonial matcha"],
  [/\boat milk\b/i, "Oat milk"],
  [/\bdairy[- ]free\b|\bnon[- ]dairy\b/i, "Dairy-free options"],
  [/\bvegan\b/i, "Vegan options"],
  [/\bgluten[- ]free\b/i, "Gluten-free options"],
  [/\boutdoor seating\b|\bpatio\b|\bterrace\b|\bterraza\b/i, "Outdoor seating"],
  [/\bfree wi-?fi\b|\bwi-?fi\b/i, "Free Wi-Fi"],
  [/\bpet[- ]friendly\b|\bdog[- ]friendly\b|\bdogs welcome\b/i, "Pet friendly"],
  [/\bwheelchair\b/i, "Wheelchair accessible"],
  [/\bto[- ]go\b|\btakeaway\b|\btake[- ]out\b|\btakeout\b/i, "Takeaway"],
  [/\bgift sets?\b|\bgift boxes?\b/i, "Gift sets"],
  [/\bworkshops?\b/i, "Workshops and events"],
];

const norm = (x: unknown) => String(x ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const addrText = (n: Record<string, unknown>) => { const a = n.address as Record<string, unknown> | string | undefined; return norm(typeof a === "string" ? a : a ? `${a.streetAddress ?? ""} ${a.addressLocality ?? ""}` : ""); };

// Hours come from ONE business node (a site can describe several places, e.g. a salon and a café, or two branches): the node whose address matches this
// café, or the only distinct set found. When it is ambiguous no hours are suggested, since wrong hours are worse than none.
function pickHours(nodes: unknown[], hint?: { city?: string; street?: string }): Record<string, string> {
  const sets = (nodes as Record<string, unknown>[]).map((n) => ({ n, h: hoursOfNode([n]) })).filter((x) => Object.keys(x.h).length);
  if (!sets.length) return {};
  const distinct = new Set(sets.map((x) => JSON.stringify(x.h)));
  if (distinct.size === 1) return sets[0].h;
  const street = norm(hint?.street).replace(/^\d+\s*/, ""), city = norm(hint?.city);
  const byStreet = street ? sets.filter((x) => addrText(x.n).includes(street)) : [];
  if (byStreet.length && new Set(byStreet.map((x) => JSON.stringify(x.h))).size === 1) return byStreet[0].h;
  const byCity = city ? sets.filter((x) => addrText(x.n).includes(city)) : [];
  if (byCity.length && new Set(byCity.map((x) => JSON.stringify(x.h))).size === 1) return byCity[0].h;
  return {};
}

export function parseSite(htmlPages: { url: string; html: string }[], base: string, hint?: { city?: string; street?: string }): Suggestions {
  const out: Suggestions = {};
  const links: Record<string, string> = {};
  let text = "";
  const nodes: unknown[] = [];
  for (const { html } of htmlPages) {
    nodes.push(...jsonLd(html));
    text += " " + decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
      const href = decode(m[1]).trim();
      if (/^mailto:/i.test(href) && !out.public_email) {
        const e = href.slice(7).split("?")[0].trim();
        if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) && !/noreply|no-reply|wixpress|sentry|example\.|@2x|\.(png|jpg|webp)$/i.test(e)) out.public_email = e.toLowerCase().slice(0, 120);
      } else if (/^tel:/i.test(href) && !out.phone) {
        const p = decodeURIComponent(href.slice(4)).trim();
        if (/\d{7,}/.test(p.replace(/\D/g, ""))) out.phone = p.slice(0, 40);
      } else if (/^https?:\/\//i.test(href)) {
        for (const [key, re, fmt] of SOCIAL) {
          const mm = re.exec(href);
          if (mm) { const v = fmt(mm); if (v && !links[key]) links[key] = v.slice(0, 200); break; }
        }
        if (!out.order_url && ORDER.test(href)) out.order_url = href.slice(0, 200);
        if (!out.reservation_url && RESERVE.test(href)) out.reservation_url = href.slice(0, 200);
      }
    }
  }
  for (const n of nodes as Record<string, unknown>[]) {
    if (!out.phone && typeof n.telephone === "string" && /\d{7,}/.test(n.telephone.replace(/\D/g, ""))) out.phone = n.telephone.trim().slice(0, 40);
    if (!out.public_email && typeof n.email === "string" && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(n.email.replace(/^mailto:/i, ""))) out.public_email = n.email.replace(/^mailto:/i, "").toLowerCase().slice(0, 120);
    const same = Array.isArray(n.sameAs) ? n.sameAs : n.sameAs ? [n.sameAs] : [];
    for (const href of same as string[]) {
      for (const [key, re, fmt] of SOCIAL) {
        const mm = re.exec(String(href));
        if (mm) { const v = fmt(mm); if (v && !links[key]) links[key] = v.slice(0, 200); break; }
      }
    }
  }
  const hours = pickHours(nodes, hint);
  if (Object.keys(hours).length) out.hours = hours;
  if (Object.keys(links).length) out.links = links;

  const first = htmlPages[0]?.html ?? "";
  const meta = (name: string) => {
    const m = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i").exec(first) ?? new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i").exec(first);
    return m ? decode(m[1]).replace(/\s+/g, " ").trim() : "";
  };
  const desc = meta("og:description") || meta("description");
  if (desc.length >= 25 && !/^(home|welcome)$/i.test(desc)) {
    if (desc.length <= 140) out.tagline = desc;
    else out.bio = desc.slice(0, 2500);
  }
  const am = KEYWORDS.filter(([re]) => re.test(text)).map(([, a]) => a);
  if (am.length) out.amenities = am.slice(0, 16);
  out.website_url = base;
  return out;
}

// Which pages of the site are worth reading as well as the home page (contact / hours / about).
export function extraPages(html: string, base: string): string[] {
  const found: string[] = [];
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    let u: URL;
    try { u = new URL(decode(m[1]), base); } catch { continue; }
    if (u.origin !== new URL(base).origin) continue;
    if (/\/(contact|contacto|about|about-us|visit|visit-us|hours|find-us|location|locations|nosotros|sobre-nosotros|contact-us)\/?$/i.test(u.pathname) && !found.includes(u.href)) found.push(u.href);
    if (found.length >= 2) break;
  }
  return found;
}

// What the editor shows after filling: which empty fields received a value (never overwrites what the owner already typed).
export function mergeIntoPage(page: OwnerPage, s: Suggestions): { page: OwnerPage; filled: string[] } {
  const next: OwnerPage = { ...page, hours: { ...page.hours }, links: { ...page.links }, amenities: [...page.amenities] };
  const filled: string[] = [];
  const txt: [keyof Suggestions & keyof OwnerPage, string][] = [["tagline", "tagline"], ["bio", "story"], ["phone", "phone"], ["public_email", "email"], ["website_url", "website"], ["order_url", "order link"], ["reservation_url", "reservation link"]];
  for (const [k, label] of txt) {
    const v = s[k];
    if (v && !(next[k] as string | null)?.trim()) { (next as Record<string, unknown>)[k] = v; filled.push(label); }
  }
  let h = 0;
  for (const [d, v] of Object.entries(s.hours ?? {})) if (!next.hours[d]?.trim()) { next.hours[d] = v; h++; }
  if (h) filled.push(`hours (${h} day${h > 1 ? "s" : ""})`);
  const added: string[] = [];
  for (const [n, v] of Object.entries(s.links ?? {})) if (!next.links[n]?.trim()) { next.links[n] = v; added.push(n === "x" ? "X" : n.replace("_", " ")); }
  if (added.length) filled.push(`links (${added.join(", ")})`);
  if (!next.amenities.length && s.amenities?.length) { next.amenities = s.amenities.slice(0, 16); filled.push("what you offer"); }
  return { page: next, filled };
}
