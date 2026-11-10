"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/i18n/client";
import { submitCafeSuggestion } from "@/lib/cafe-suggest";

const field = "border border-line-strong rounded-sm px-3 py-2.5 bg-paper text-sm text-ink focus:outline-none focus:border-matcha w-full";
const label = "block text-xs font-medium tracking-wide uppercase text-ink-faint mb-1.5";

// "Suggest a café": a short form that stores the suggestion for review. Nothing is published from it
// directly; each café is checked against its own menu before it goes on the map.
export function SuggestCafe({ contactEmail }: { contactEmail: string }) {
  const t = useT();
  const lang = useLang();
  const ref = useRef<HTMLDetailsElement | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  // The "tell us" link elsewhere on the page points at #suggest-cafe: open the form when it is used.
  useEffect(() => {
    const open = () => {
      if (window.location.hash === "#suggest-cafe" && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (String(f.get("website_url") ?? "")) { setState("done"); return; } // hidden trap field: bots fill it in, people never see it
    setState("sending");
    const ok = await submitCafeSuggestion({
      name: String(f.get("name") ?? ""),
      address: String(f.get("address") ?? ""),
      link: String(f.get("link") ?? ""),
      note: String(f.get("note") ?? ""),
      email: String(f.get("email") ?? ""),
      locale: lang,
    });
    setState(ok ? "done" : "error");
  }

  return (
    <details ref={ref} id="suggest-cafe" className="mt-6 max-w-2xl border border-line rounded-sm bg-paper-raised">
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-matcha hover:text-forest">
        {t("c.sg.btn")}
      </summary>
      <div className="px-5 pb-5 pt-1">
        {state === "done" ? (
          <p className="text-sm text-ink" role="status">{t("c.sg.thanks")}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted leading-relaxed">{t("c.sg.intro")}</p>
            <div>
              <label htmlFor="sg-name" className={label}>{t("c.sg.name")}</label>
              <input id="sg-name" name="name" required minLength={2} maxLength={120} className={field} />
            </div>
            <div>
              <label htmlFor="sg-address" className={label}>{t("c.sg.addr")}</label>
              <input id="sg-address" name="address" required minLength={3} maxLength={200} autoComplete="street-address" className={field} />
            </div>
            <div>
              <label htmlFor="sg-link" className={label}>{t("c.sg.link")}</label>
              <input id="sg-link" name="link" type="text" inputMode="url" maxLength={300} className={field} />
            </div>
            <div>
              <label htmlFor="sg-note" className={label}>{t("c.sg.note")}</label>
              <input id="sg-note" name="note" maxLength={500} className={field} />
            </div>
            <div>
              <label htmlFor="sg-email" className={label}>{t("c.sg.email")}</label>
              <input id="sg-email" name="email" type="email" maxLength={200} autoComplete="email" className={field} />
            </div>
            {/* trap field for bots; hidden from people and from assistive tech */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label>Leave this empty<input name="website_url" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={state === "sending"} className="rounded-sm bg-matcha px-5 py-2.5 text-sm font-medium text-paper hover:bg-forest transition-colors disabled:opacity-50">
                {state === "sending" ? t("c.sg.sending") : t("c.sg.send")}
              </button>
              <p className="text-xs text-ink-faint">{t("c.sg.privacy")}</p>
            </div>
            {state === "error" && (
              <p className="text-sm text-red-700" role="alert">
                {t("c.sg.err")}{" "}
                <a className="underline" href={`mailto:${contactEmail}?subject=${encodeURIComponent("MatchaDB café suggestion")}`}>{contactEmail}</a>
              </p>
            )}
          </form>
        )}
      </div>
    </details>
  );
}
