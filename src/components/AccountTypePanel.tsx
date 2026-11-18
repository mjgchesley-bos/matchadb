"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { submitFeedback } from "@/lib/feedback";
import { useT } from "@/i18n/client";

type Row = { account_type: "general" | "cafe_owner" | "wholesaler"; business_name: string | null; website: string | null; about: string | null; accept_dms: boolean };
type Req = { kind: string; business: string; status: string };

// My matcha: account type. Everyone starts as a general member. Café owners and wholesalers ask for the type (the owner of the site approves it);
// once approved they can add business details to their profile. Hidden until supabase/tiers_menus_dms.sql has been run.
export function AccountTypePanel() {
  const t = useT();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [row, setRow] = useState<Row | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [form, setForm] = useState({ kind: "cafe_owner", business: "", website: "", note: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    const sb = supabase();
    sb.from("profiles").select("account_type, business_name, website, about, accept_dms").eq("id", uid).maybeSingle().then(({ data, error }) => live && !error && setRow(data as Row | null));
    sb.from("account_requests").select("kind, business, status").order("created_at", { ascending: false }).limit(5).then(({ data, error }) => live && !error && setReqs((data as Req[]) ?? []));
    return () => { live = false; };
  }, [uid]);

  if (!user || !row) return null;
  const input = "mt-1 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-matcha focus:outline-none";
  const lbl = "block text-sm text-ink-muted";
  const pending = reqs.find((r) => r.status === "pending");

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase().from("account_requests").insert({ kind: form.kind, business: form.business.trim(), website: form.website.trim() || null, note: form.note.trim() || null });
    if (error) setMsg(t("c.ty.err"));
    else {
      void submitFeedback(`[Account request] ${form.kind}: ${form.business.trim()} ${form.website.trim()} ${form.note.trim()}`.trim(), "/account", "en");
      setReqs([{ kind: form.kind, business: form.business.trim(), status: "pending" }, ...reqs]);
      setMsg(t("c.ty.sent"));
    }
    setBusy(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setBusy(true);
    setMsg(null);
    const w = (row.website ?? "").trim();
    if (w && !/^https:\/\/\S+$/.test(w)) { setBusy(false); return setMsg(t("c.ty.https")); }
    const { error } = await supabase().from("profiles").update({ business_name: row.business_name?.trim() || null, website: w || null, about: row.about?.trim() || null }).eq("id", user!.id);
    setMsg(error ? t("c.ty.err") : t("c.ty.saved"));
    setBusy(false);
  }
  async function setDms(v: boolean) {
    if (!row) return;
    setRow({ ...row, accept_dms: v });
    await supabase().from("profiles").update({ accept_dms: v }).eq("id", user!.id);
  }

  return (
    <section className="rounded-sm border border-line bg-paper-raised p-5">
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={row.accept_dms} onChange={(e) => void setDms(e.target.checked)} className="h-4 w-4 accent-matcha" />
        {t("c.ty.dms")}
      </label>

      {row.account_type === "general" ? (
        pending ? (
          <p className="mt-4 text-sm text-ink" role="status">{t("c.ty.pending", { business: pending.business })}</p>
        ) : (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-matcha underline hover:text-forest">{t("c.mp.bizAsk")}</summary>
            <form onSubmit={request} className="mt-4 flex max-w-xl flex-col gap-3">
              <div className="flex gap-4 text-sm text-ink">
                {(["cafe_owner", "wholesaler"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="radio" name="kind" checked={form.kind === k} onChange={() => setForm({ ...form, kind: k })} className="accent-matcha" />
                    {t(`c.ty.${k}` as "c.ty.cafe_owner")}
                  </label>
                ))}
              </div>
              <label className={lbl}>{t("c.ty.business")}<input required minLength={2} maxLength={80} value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} className={input} /></label>
              <label className={lbl}>{t("c.ty.site")}<input maxLength={160} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" className={input} /></label>
              <label className={lbl}>{t("c.ty.note")}<textarea maxLength={500} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={input} /></label>
              <div><button type="submit" disabled={busy} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{t("c.ty.request")}</button></div>
            </form>
          </details>
        )
      ) : (
        <form onSubmit={save} className="mt-5 flex max-w-xl flex-col gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">{t("c.mp.bizH")}</h2>
          <label className={lbl}>{t("c.ty.business")}<input maxLength={60} value={row.business_name ?? ""} onChange={(e) => setRow({ ...row, business_name: e.target.value })} className={input} /></label>
          <label className={lbl}>{t("c.ty.site")}<input maxLength={120} value={row.website ?? ""} onChange={(e) => setRow({ ...row, website: e.target.value })} placeholder="https://" className={input} /></label>
          <label className={lbl}>{t("c.ty.about")}<textarea maxLength={600} rows={4} value={row.about ?? ""} onChange={(e) => setRow({ ...row, about: e.target.value })} className={input} /></label>
          <div><button type="submit" disabled={busy} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">{t("c.ty.save")}</button></div>
        </form>
      )}
      {msg && <p className="mt-3 text-sm text-ink" role="status">{msg}</p>}
    </section>
  );
}
