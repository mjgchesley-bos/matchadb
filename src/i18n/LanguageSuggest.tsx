"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "./config";
import { useLang } from "./client";
import { goToLocale, LANG_COOKIE } from "./LanguageMenu";

type Other = Exclude<Locale, "en">;

// Shown once, on the English site, to visitors whose browser is set to one of our other languages.
// It is written in the visitor's language on purpose (it appears before they have chosen one).
const COPY: Record<Other, { text: string; yes: string; no: string }> = {
  ja: { text: "このサイトは日本語でもご覧いただけます。", yes: "日本語で見る", no: "このまま" },
  ko: { text: "이 사이트는 한국어로도 볼 수 있습니다.", yes: "한국어로 보기", no: "그대로 보기" },
  zh: { text: "本网站提供简体中文版本。", yes: "查看中文版", no: "保持英文" },
  es: { text: "Este sitio también está disponible en español.", yes: "Ver en español", no: "No, gracias" },
  fr: { text: "Ce site est aussi disponible en français.", yes: "Voir en français", no: "Non merci" },
  de: { text: "Diese Seite ist auch auf Deutsch verfügbar.", yes: "Auf Deutsch ansehen", no: "Nein danke" },
};

function preferred(): Other | null {
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
  for (const raw of langs) {
    const base = (raw || "").toLowerCase().split("-")[0];
    if (base === "en") return null; // their first choice is English: nothing to suggest
    const hit = LOCALES.find((l) => l === base && l !== "en");
    if (hit) return hit as Other;
  }
  return null;
}

export function LanguageSuggest() {
  const lang = useLang();
  const [target, setTarget] = useState<Other | null>(null);

  useEffect(() => {
    if (lang !== "en") return;
    try {
      if (document.cookie.includes(`${LANG_COOKIE}=`) || localStorage.getItem("matchadb-lang-dismissed")) return;
    } catch {
      // Storage blocked: just show the suggestion.
    }
    // Reading the browser's language is only possible after the page has loaded in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(preferred());
  }, [lang]);

  if (!target) return null;
  const c = COPY[target];
  const dismiss = () => {
    try {
      localStorage.setItem("matchadb-lang-dismissed", "1");
    } catch {
      // Storage blocked: it will show again next visit.
    }
    setTarget(null);
  };
  return (
    <div role="region" lang={target} aria-label={LOCALE_NAMES[target]} className="bg-matcha-soft border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
        <span className="flex-1 min-w-[12rem]">{c.text}</span>
        <button type="button" onClick={() => goToLocale(target)} className="rounded-full bg-matcha text-paper px-4 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-transform">
          {c.yes}
        </button>
        <button type="button" onClick={dismiss} className="text-ink-muted underline hover:text-ink">
          {c.no}
        </button>
      </div>
    </div>
  );
}
