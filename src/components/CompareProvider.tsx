"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// The product compare queue: up to three products a visitor has picked to compare side by side. Kept in this browser only (localStorage).
export type CompareItem = { id: number; name: string; brand: string };
export const COMPARE_MAX = 3;
const KEY = "matchadb-compare";

type Ctx = { items: CompareItem[]; has: (id: number) => boolean; toggle: (item: CompareItem) => void; remove: (id: number) => void; clear: () => void };
const CompareContext = createContext<Ctx>({ items: [], has: () => false, toggle: () => {}, remove: () => {}, clear: () => {} });

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(raw)) setItems(raw.filter((x) => x && Number.isInteger(x.id) && typeof x.name === "string").slice(0, COMPARE_MAX));
    } catch {
      // storage unavailable: start empty
    }
  }, []);

  const save = useCallback((next: CompareItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable: the queue lasts for this page view only
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      has: (id) => items.some((x) => x.id === id),
      toggle: (item) => save(items.some((x) => x.id === item.id) ? items.filter((x) => x.id !== item.id) : items.length >= COMPARE_MAX ? items : [...items, item]),
      remove: (id) => save(items.filter((x) => x.id !== id)),
      clear: () => save([]),
    }),
    [items, save]
  );
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
