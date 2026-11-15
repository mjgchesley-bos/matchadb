"use client";

import { useState } from "react";
import { useLang, useT } from "@/i18n/client";
import { submitFeedback } from "@/lib/feedback";
import { useAuth } from "@/components/AuthProvider";

// "Feedback or feature requests?" on profile pages: members only. A short text box whose message goes to the owner's activity log.
export function FeedbackButton({ contactEmail }: { contactEmail: string }) {
  const t = useT();
  const lang = useLang();
  const { user, signIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (String(f.get("website_url") ?? "")) { setState("done"); return; } // hidden trap field for bots
    setState("sending");
    const ok = await submitFeedback(text, window.location.pathname, lang);
    setState(ok ? "done" : "error");
    if (ok) setText("");
  }

  const pill = "inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-matcha hover:bg-matcha-soft";
  if (!user) {
    return (
      <button type="button" onClick={() => signIn(t("c.fb.signupWhy"))} className={pill}>
        {t("c.fb.btn")}
      </button>
    );
  }
  return (
    <div>
      <button type="button" onClick={() => { setOpen((o) => !o); if (state === "done") setState("idle"); }} aria-expanded={open} className={pill}>
        {t("c.fb.btn")}
      </button>
      {open && (
        <div className="mt-3 max-w-xl rounded-sm border border-line bg-paper-raised p-4">
          {state === "done" ? (
            <p className="text-sm text-ink" role="status">{t("c.fb.thanks")}</p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <label htmlFor="fb-text" className="text-sm text-ink-muted">{t("c.fb.intro")}</label>
              <textarea
                id="fb-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                minLength={3}
                maxLength={2000}
                rows={5}
                className="w-full rounded-sm border border-line-strong bg-paper px-3 py-2.5 text-sm text-ink focus:border-matcha focus:outline-none"
              />
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                <label>Leave this empty<input name="website_url" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={state === "sending" || text.trim().length < 3} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest disabled:opacity-50">
                  {state === "sending" ? t("c.fb.sending") : t("c.fb.send")}
                </button>
                <span className="text-xs tabular-nums text-ink-faint">{text.length}/2000</span>
              </div>
              {state === "error" && (
                <p className="text-sm text-red-700" role="alert">
                  {t("c.fb.err")}{" "}
                  <a className="underline" href={`mailto:${contactEmail}?subject=${encodeURIComponent("MatchaDB feedback")}`}>{contactEmail}</a>
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
