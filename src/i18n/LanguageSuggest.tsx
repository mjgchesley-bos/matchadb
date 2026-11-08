"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "./config";
import { useLang } from "./client";
import { goToLocale, LANG_COOKIE } from "./LanguageMenu";

// A small pop-up in the top right, like the browser's own translate bubble: it offers the site in the
// visitor's language. It is written in that language on purpose (it appears before they have chosen one).
const COPY: Record<Locale, { text: string; yes: string; no: string; close: string }> = {
  en: { text: "Translate this site to English?", yes: "Translate", no: "Not now", close: "Close" },
  ja: { text: "このサイトを日本語に翻訳しますか?", yes: "翻訳する", no: "今はしない", close: "閉じる" },
  ko: { text: "이 사이트를 한국어로 번역할까요?", yes: "번역", no: "나중에", close: "닫기" },
  zh: { text: "要将本网站翻译成中文吗?", yes: "翻译", no: "暂不", close: "关闭" },
  es: { text: "¿Traducir este sitio al español?", yes: "Traducir", no: "Ahora no", close: "Cerrar" },
  fr: { text: "Traduire ce site en français ?", yes: "Traduire", no: "Pas maintenant", close: "Fermer" },
  de: { text: "Diese Seite ins Deutsche übersetzen?", yes: "Übersetzen", no: "Nicht jetzt", close: "Schließen" },
};

// The visitor's country, guessed from their time zone, mapped to one of our languages. Only used when the
// browser's own language list does not already point to a language we have.
const ZONE_LANG: Record<string, Locale> = {
  "Asia/Tokyo": "ja",
  "Asia/Seoul": "ko",
  "Asia/Shanghai": "zh",
  "Asia/Chongqing": "zh",
  "Asia/Harbin": "zh",
  "Asia/Urumqi": "zh",
  "Europe/Madrid": "es",
  "Atlantic/Canary": "es",
  "America/Mexico_City": "es",
  "America/Bogota": "es",
  "America/Lima": "es",
  "America/Santiago": "es",
  "America/Argentina/Buenos_Aires": "es",
  "Europe/Paris": "fr",
  "Europe/Berlin": "de",
  "Europe/Vienna": "de",
  "Europe/Zurich": "de",
};

function preferred(): Locale {
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
  for (const raw of langs) {
    const base = (raw || "").toLowerCase().split("-")[0];
    const hit = LOCALES.find((l) => l === base);
    if (hit) {
      if (hit !== "en") return hit;
      break; // their first supported choice is English: fall through to the country check
    }
  }
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && ZONE_LANG[zone]) return ZONE_LANG[zone];
  } catch {
    // No time zone available: English.
  }
  return "en";
}

const dismissedKey = (l: Locale) => `matchadb-translate-dismissed-${l}`;

export function LanguageSuggest() {
  const lang = useLang();
  const [target, setTarget] = useState<Locale | null>(null);

  useEffect(() => {
    // They already picked a language with the menu: do not second-guess it.
    try {
      if (document.cookie.includes(`${LANG_COOKIE}=`)) return;
    } catch {
      // Cookies blocked: carry on.
    }
    const want = preferred();
    if (want === lang) return;
    try {
      if (localStorage.getItem(dismissedKey(want))) return;
    } catch {
      // Storage blocked: just show the pop-up.
    }
    // Reading the browser's language is only possible after the page has loaded in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(want);
  }, [lang]);

  if (!target) return null;
  const c = COPY[target];
  const dismiss = () => {
    try {
      localStorage.setItem(dismissedKey(target), "1");
    } catch {
      // Storage blocked: it will show again next visit.
    }
    setTarget(null);
  };
  return (
    <div
      role="dialog"
      lang={target}
      aria-label={LOCALE_NAMES[target]}
      className="fixed right-3 top-[4.5rem] z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-line bg-paper-raised p-4 shadow-xl sm:right-5 sm:top-20"
    >
      <button type="button" onClick={dismiss} aria-label={c.close} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-matcha-soft hover:text-ink">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <p className="pr-7 text-sm font-medium text-ink">{c.text}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{LOCALE_NAMES[target]}</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => goToLocale(target)} className="rounded-full bg-matcha px-4 py-1.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5">
          {c.yes}
        </button>
        <button type="button" onClick={dismiss} className="text-sm text-ink-muted underline hover:text-ink">
          {c.no}
        </button>
      </div>
    </div>
  );
}
