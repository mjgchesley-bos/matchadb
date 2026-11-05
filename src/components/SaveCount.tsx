"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// "Saved by N people" for a product or a brand (counts only; never who). Pass a changing `refresh`
// value to reload after the visitor saves or unsaves.
export function SaveCount({ kind, itemKey, refresh = 0 }: { kind: "product" | "brand"; itemKey: string; refresh?: number }) {
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
      Saved by {count.toLocaleString()} {count === 1 ? "person" : "people"}
    </span>
  );
}
