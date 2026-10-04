"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "matchadb-consent";
const OPEN_EVENT = "matchadb:open-consent";

type Choice = "granted" | "denied";

function applyChoice(choice: Choice) {
  window.gtag?.("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

// Consent Mode v2: layout.tsx sets every storage type to "denied" before
// gtag loads and replays a stored "granted" choice immediately, so nothing
// is stored or personalised until a visitor opts in here. This banner only
// records the choice and tells gtag about it.
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readChoice() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  function choose(choice: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage blocked: the choice still applies for this page view.
    }
    applyChoice(choice);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-paper-raised"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-ink-muted flex-1">
          MatchaDB uses cookies for analytics and, where ads are shown, to measure and personalize
          them. You can accept or decline; the site works the same either way. See our{" "}
          <a href="/privacy" className="text-matcha hover:text-forest underline">
            privacy policy
          </a>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-full border border-line-strong text-ink px-5 py-2 text-sm font-medium hover:border-matcha transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-full bg-matcha text-paper px-5 py-2 text-sm font-medium hover:-translate-y-0.5 transition-transform"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="underline hover:text-ink-muted transition-colors"
    >
      Cookie settings
    </button>
  );
}
