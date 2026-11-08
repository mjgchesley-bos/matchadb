"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

// "Want to try / Using now / Tried it": a personal shelf for each product. Picking the same
// status again clears it.
export type ShelfStatus = "want" | "using" | "tried";
export const SHELF_LABELS: Record<ShelfStatus, string> = { want: "Want to try", using: "Using now", tried: "Tried it" };
export const SHELF_KEYS = { want: "c.shelf.want", using: "c.shelf.using", tried: "c.shelf.tried" } as const;
const ORDER: ShelfStatus[] = ["want", "using", "tried"];

export function ShelfButtons({ productId, productName }: { productId: number; productName: string }) {
  const { user, ready, signIn, refreshStats } = useAuth();
  const t = useT();
  const uid = user?.id ?? null;
  const [state, setState] = useState<{ uid: string; status: ShelfStatus | null } | null>(null);
  const status = uid && state?.uid === uid ? state.status : null;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [counts, setCounts] = useState<{ status: ShelfStatus; members: number }[]>([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("shelf")
      .select("status")
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data }) => live && setState({ uid, status: (data?.status as ShelfStatus | undefined) ?? null }));
    return () => {
      live = false;
    };
  }, [uid, productId]);

  useEffect(() => {
    let live = true;
    supabase()
      .from("shelf_counts")
      .select("status, members")
      .eq("product_id", productId)
      .then(({ data }) => live && setCounts((data as { status: ShelfStatus; members: number }[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [productId, bump]);

  const pick = async (next: ShelfStatus) => {
    if (!user) {
      signIn(t("c.shelf.signIn", { name: productName }));
      return;
    }
    const clearing = status === next;
    setBusy(true);
    setFailed(false);
    const sb = supabase();
    const { error } = clearing
      ? await sb.from("shelf").delete().eq("user_id", user.id).eq("product_id", productId)
      : await sb.from("shelf").upsert({ user_id: user.id, product_id: productId, status: next, updated_at: new Date().toISOString() }, { onConflict: "user_id,product_id" });
    if (error) {
      setFailed(true);
    } else {
      setState({ uid: user.id, status: clearing ? null : next });
      if (!clearing) window.gtag?.("event", "shelf_set", { product_id: productId, status: next });
      void refreshStats();
      setBump((b) => b + 1);
    }
    setBusy(false);
  };

  return (
    <div className="mt-3" role="group" aria-label={t("c.shelf.aria", { name: productName })}>
      <div className="flex flex-wrap items-center gap-2">
        {ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void pick(s)}
            disabled={busy || !ready}
            aria-pressed={status === s}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-60 ${
              status === s ? "border-matcha bg-matcha text-paper" : "border-line-strong bg-paper-raised text-ink hover:bg-matcha-soft"
            }`}
          >
            {t(SHELF_KEYS[s])}
          </button>
        ))}
      </div>
      {counts.some((c) => c.members > 0) && (
        <p className="mt-1.5 text-xs text-ink-faint tabular-nums">
          {ORDER.map((s) => {
            const n = counts.find((c) => c.status === s)?.members ?? 0;
            return n > 0 ? t(`c.shelf.n.${s}` as "c.shelf.n.want", { n }) : null;
          })
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {status === "tried" && <p className="mt-1.5 text-xs text-ink-faint">{t("c.shelf.rateHint")}</p>}
      {failed && <p className="mt-1.5 text-xs text-red-700">{t("c.shelf.failed")}</p>}
    </div>
  );
}
