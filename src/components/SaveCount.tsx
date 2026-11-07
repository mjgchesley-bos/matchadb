"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang, useT } from "@/i18n/client";
import { INTL_LANG } from "@/i18n/config";

// "Saved by N people" for a product, brand or café (counts only; never who). Pass a changing `refresh`
// value to reload after the visitor saves or unsaves.
export function SaveCount({ kind, itemKey, refresh = 0 }: { kind: "product" | "brand" | "cafe"; itemKey: string; refresh?: number }) {
  const t = useT();
  const lang = useLang();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    supabase()
      .from("favorite_counts")
      .select("saves")
      .eq("kind", kind)
      .eq("key", itemKey)
      .maybeSingle()
      .then(({ data }) => live && setCount(data?.saves ?? 0));
    return () => {
      live = false;
    };
  }, [kind, itemKey, refresh]);

  if (!count) return null;
  return (
    <span className="text-sm text-ink-muted tabular-nums">
      {t(count === 1 ? "c.save.count.one" : "c.save.count.other", { count: count.toLocaleString(INTL_LANG[lang]) })}
    </span>
  );
}
