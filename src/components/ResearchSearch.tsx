"use client";

import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { name: string; count: number };

// The big search box at the top of the research library. It is an ordinary text
// input attached (via the `form` attribute) to the filter form further down the
// page, so it works with no JavaScript at all and keeps whatever filters are
// set when a search is submitted. With JavaScript it also suggests keywords
// as you type (from the library's own author keywords and subject terms).
export function ResearchSearch({ defaultValue, formId }: { defaultValue?: string; formId: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // The last word being typed is what gets suggested; picking one swaps it in.
  const lastWord = value.split(/\s+/).pop() ?? "";

  useEffect(() => {
    const term = lastWord.replace(/^[-"]+/, "");
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/research/suggest?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const j = (await r.json()) as { suggestions: Suggestion[] };
        setItems(j.suggestions);
        setActive(-1);
      } catch {
        /* suggestions are a convenience: the search still works without them */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [lastWord]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(name: string) {
    const words = value.split(/\s+/);
    const prefix = words.slice(0, -1).join(" ");
    const needsQuotes = /\s/.test(name);
    setValue(`${prefix ? prefix + " " : ""}${needsQuotes ? `"${name}"` : name} `);
    setOpen(false);
    setItems([]);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          form={formId}
          name="q"
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search the research library by keyword"
          placeholder="Search studies by keyword — try theanine, sleep, lead, gut microbiota…"
          className="flex-1 min-w-0 border border-line-strong rounded-full px-5 py-3.5 bg-paper-raised text-base text-ink placeholder:text-ink-faint focus:outline-none focus:border-matcha transition-colors"
        />
        <button
          type="submit"
          form={formId}
          className="rounded-full bg-matcha text-paper px-6 sm:px-8 py-3.5 text-sm font-medium tracking-wide hover:bg-forest transition-colors shrink-0"
        >
          Search
        </button>
      </div>
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 left-0 right-0 sm:right-28 mt-2 border border-line-strong rounded-sm bg-paper-raised shadow-md overflow-hidden"
        >
          {items.map((it, i) => (
            <li
              key={it.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(it.name);
              }}
              className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm cursor-pointer ${i === active ? "bg-matcha-soft text-matcha-ink" : "text-ink-muted hover:bg-matcha-soft"}`}
            >
              <span>{it.name}</span>
              <span className="text-xs text-ink-faint tabular-nums">{it.count} studies</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
