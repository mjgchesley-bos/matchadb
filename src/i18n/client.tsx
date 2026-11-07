"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { format } from "./format";
import type { Locale } from "./config";
import type { Key } from "./dictionaries";

type Ctx = { lang: Locale; messages: Record<string, string> };
const I18nContext = createContext<Ctx>({ lang: "en", messages: {} });

export function I18nProvider({ lang, messages, children }: { lang: Locale; messages: Record<string, string>; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, messages }), [lang, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLang(): Locale {
  return useContext(I18nContext).lang;
}

// Client-side translator for "c." keys: const t = useT(); t("c.consent.accept")
export function useT() {
  const { messages } = useContext(I18nContext);
  return useCallback((key: Key, vars?: Record<string, string | number>) => format(messages[key] ?? key, vars), [messages]);
}

// Client-side version of the database-value translator.
export function useTV() {
  const { messages } = useContext(I18nContext);
  return useCallback((group: string, value: string) => messages[`v.${group}.${value}`] ?? value, [messages]);
}
