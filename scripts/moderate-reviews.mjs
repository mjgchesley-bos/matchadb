// Review moderation for MatchaDB. Runs on your own machine with the Supabase secret key
// (SUPABASE_SECRET_KEY in .env.local); the website never has that key.
//
//   node scripts/moderate-reviews.mjs                 list reviews waiting for approval + reports
//   node scripts/moderate-reviews.mjs approve <id>    publish one review (id or its first 8 characters)
//   node scripts/moderate-reviews.mjs approve all     publish everything waiting
//   node scripts/moderate-reviews.mjs hide <id>       take a review down (author sees it was removed)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!KEY) {
  console.error("SUPABASE_SECRET_KEY is not set in .env.local");
  process.exit(1);
}

async function api(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const [cmd = "list", target] = process.argv.slice(2);

async function resolveIds(t) {
  const rows = await api("reviews?select=id,status");
  const hits = rows.filter((r) => r.id === t || r.id.startsWith(t));
  if (hits.length !== 1) throw new Error(`Expected one review matching "${t}", found ${hits.length}.`);
  return hits[0].id;
}

if (cmd === "list") {
  const pending = await api("reviews?status=eq.pending&order=created_at.asc&select=id,product_id,body,created_at,user_id");
  const names = Object.fromEntries((await api("profiles?select=id,display_name")).map((p) => [p.id, p.display_name]));
  console.log(`\n${pending.length} review(s) waiting for approval\n`);
  for (const r of pending) {
    console.log(`${r.id.slice(0, 8)}  product ${r.product_id}  by ${names[r.user_id] ?? "?"}  ${r.created_at.slice(0, 10)}`);
    console.log(`  https://www.matchadb.com/products/${r.product_id}`);
    console.log(`  ${r.body.replace(/\s+/g, " ")}\n`);
  }
  const reports = await api("review_reports?order=created_at.desc&select=review_id,reason,created_at&limit=50");
  console.log(`${reports.length} report(s)`);
  for (const rep of reports) console.log(`  review ${rep.review_id.slice(0, 8)}: ${rep.reason} (${rep.created_at.slice(0, 10)})`);
} else if (cmd === "approve" && target === "all") {
  const rows = await api("reviews?status=eq.pending", { method: "PATCH", body: JSON.stringify({ status: "approved" }) });
  console.log(`Approved ${rows.length} review(s).`);
} else if ((cmd === "approve" || cmd === "hide") && target) {
  const id = await resolveIds(target);
  const status = cmd === "approve" ? "approved" : "hidden";
  await api(`reviews?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  console.log(`${id.slice(0, 8)} is now ${status}.`);
} else {
  console.error("Usage: node scripts/moderate-reviews.mjs [list | approve <id|all> | hide <id>]");
  process.exit(1);
}
