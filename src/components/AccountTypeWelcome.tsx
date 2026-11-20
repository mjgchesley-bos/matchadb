"use client";

import { useEffect, useState } from "react";
import { useAuth, TYPE_KEY } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

type Kind = "general" | "cafe_owner" | "wholesaler";

// Asked once, right after a member first signs in: general member, café owner or wholesaler. Owners and wholesalers file an account request
// (the site owner approves it); until then they are general members. Shown again never; the choice can be changed later in My matcha.
export function AccountTypeWelcome() {
  const t = useT();
  const { user, ready, namePending } = useAuth();
  const uid = user?.id ?? null;
  const [show, setShow] = useState(false);
  const [kind, setKind] = useState<Kind>("general");
  const [business, setBusiness] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const flag = (id: string) => `matchadb-type-chosen:${id}`;

  useEffect(() => {
    if (!ready || !uid || namePending) { setShow(false); return; }
    // Part of signing up only: needs the flag set when sign-in started, so it never pops up on a plain page load.
    try { if (sessionStorage.getItem(TYPE_KEY) !== "1") return; } catch { return; }
    // One time ever, at account creation: only an account made in the last half hour qualifies, and answering or skipping is recorded on the
    // account itself (so it holds on every device), not just in this browser. Regular sign-ins never see it.
    const made = Date.parse(user?.created_at ?? "");
    const brandNew = Number.isFinite(made) && Date.now() - made < 30 * 60 * 1000;
    const answered = !!(user?.user_metadata as { type_prompt_done?: boolean } | undefined)?.type_prompt_done;
    if (!brandNew || answered) { try { sessionStorage.removeItem(TYPE_KEY); } catch { /* ignore */ } return; }
    try { if (localStorage.getItem(flag(uid))) return; } catch { /* storage unavailable: fall through to the database check */ }
    let live = true;
    (async () => {
      const sb = supabase();
      const { data, error } = await sb.from("profiles").select("account_type").eq("id", uid).maybeSingle();
      if (!live || error || !data) return;                       // the account-type column isn't there yet: stay quiet
      if (data.account_type !== "general") return done(uid);
      const { data: reqs } = await sb.from("account_requests").select("id").limit(1);
      if (!live) return;
      if (reqs && reqs.length > 0) return done(uid);
      setShow(true);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uid, namePending]);

  function done(id: string) {
    try { localStorage.setItem(flag(id), "1"); } catch { /* ignore */ }
    try { sessionStorage.removeItem(TYPE_KEY); } catch { /* ignore */ }
    void supabase().auth.updateUser({ data: { type_prompt_done: true } }).catch(() => {}); // remembered on the account for good
    setShow(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setErr(null);
    if (kind === "general") return done(uid);
    if (website.trim() && !/^https:\/\/\S+$/.test(website.trim())) return setErr(t("c.ty.https"));
    setBusy(true);
    const { error } = await supabase().from("account_requests").insert({ kind, business: business.trim(), website: website.trim() || null });
    setBusy(false);
    if (error) return setErr(t("c.ty.err"));
    done(uid);
  }

  if (!show || !uid) return null;
  const opts: { k: Kind; title: string; desc: string }[] = [
    { k: "general", title: t("c.tw.general"), desc: t("c.tw.generalD") },
    { k: "cafe_owner", title: t("c.tw.owner"), desc: t("c.tw.ownerD") },
    { k: "wholesaler", title: t("c.tw.wholesaler"), desc: t("c.tw.wholesalerD") },
  ];
  const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tw-h">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-md border border-line bg-paper-raised p-6 shadow-xl">
        <h2 id="tw-h" className="font-display text-2xl font-semibold text-ink">{t("c.tw.h")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("c.tw.sub")}</p>
        <div className="mt-5 flex flex-col gap-2.5" role="radiogroup">
          {opts.map((o) => (
            <label key={o.k} className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 ${kind === o.k ? "border-matcha bg-matcha-soft" : "border-line-strong hover:bg-matcha-soft"}`}>
              <input type="radio" name="tw-kind" checked={kind === o.k} onChange={() => setKind(o.k)} className="mt-1 accent-matcha" />
              <span><span className="block text-sm font-medium text-ink">{o.title}</span><span className="block text-xs text-ink-muted">{o.desc}</span></span>
            </label>
          ))}
        </div>
        {kind !== "general" && (
          <div className="mt-4 flex flex-col gap-3">
            <label className="block text-sm text-ink-muted">{t("c.ty.business")}<input required minLength={2} maxLength={80} value={business} onChange={(e) => setBusiness(e.target.value)} className={input} /></label>
            <label className="block text-sm text-ink-muted">{t("c.ty.site")}<input maxLength={160} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={input} /></label>
            <p className="text-xs text-ink-faint">{t("c.tw.note")}</p>
          </div>
        )}
        {err && <p className="mt-3 text-sm text-red-700" role="alert">{err}</p>}
        <div className="mt-5 flex items-center gap-4">
          <button type="submit" disabled={busy} className="rounded-full bg-matcha px-6 py-2.5 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{t("c.tw.go")}</button>
          <button type="button" onClick={() => done(uid)} className="text-sm text-ink-muted underline hover:text-ink">{t("c.tw.skip")}</button>
        </div>
      </form>
    </div>
  );
}
