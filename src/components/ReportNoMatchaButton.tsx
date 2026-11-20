"use client";

import { useState } from "react";
import { useLang, useT } from "@/i18n/client";
import { submitFeedback } from "@/lib/feedback";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "@/i18n/Link";

// "Report: no matcha here" on a café page: a signed-in member tells the owner this place does not serve matcha.
// It is filed as a café removal report (supabase/cafe_removals.sql): staff see it in the /admin activity feed and the Needs you queue.
export function ReportNoMatchaButton({ cafeId, name }: { cafeId: string; name: string }) {
  const t = useT();
  const lang = useLang();
  const { user, signIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (String(f.get("website_url") ?? "")) { setState("done"); return; } // hidden trap field for bots
    setState("sending");
    // Its own table, shown to staff as "Café removal" in the activity feed and the Needs you queue. Falls back to the feedback box
    // only if that table has not been created yet, so a report is never lost.
    const { error } = await supabase().from("cafe_removal_reports").insert({ cafe_id: cafeId, cafe_name: name.slice(0, 160), note: note.trim().slice(0, 500) || null });
    if (!error || error.code === "23505") { setState("done"); return; } // 23505: this member already has a pending report for this café
    const ok = await submitFeedback(`[No matcha here] ${name} (${cafeId}): ${note.trim() || "(no note)"}`, window.location.pathname, lang);
    setState(ok ? "done" : "error");
  }

  const pill = "inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-matcha hover:bg-matcha-soft hover:text-ink";
  if (!user) {
    return (
      <button type="button" onClick={() => signIn(t("c.rep.signupWhy"))} className={pill}>
        {t("c.rep.btn")}
      </button>
    );
  }
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={pill}>
        {t("c.rep.btn")}
      </button>
      {open && (
        <div className="mt-3 max-w-xl rounded-sm border border-line bg-paper-raised p-4">
          {state === "done" ? (
            <p className="text-sm text-ink" role="status">{t("c.rep.thanks")}</p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <label htmlFor="rep-note" className="text-sm text-ink-muted">{t("c.rep.intro")}</label>
              <textarea
                id="rep-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-sm border border-line-strong bg-paper px-3 py-2.5 text-sm text-ink focus:border-matcha focus:outline-none"
              />
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                <label>Leave this empty<input name="website_url" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={state === "sending"} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest disabled:opacity-50">
                  {state === "sending" ? t("c.fb.sending") : t("c.rep.send")}
                </button>
              </div>
              {state === "error" && <p className="text-sm text-red-700" role="alert">{t("c.fb.err")} <Link href="/contact" className="underline">/contact</Link></p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
