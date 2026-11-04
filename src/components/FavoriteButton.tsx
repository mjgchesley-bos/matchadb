"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// Heart button: save a product to "My matcha". Signed-out visitors are asked to sign in first.
export function FavoriteButton({ productId, productName }: { productId: number; productName: string }) {
  const { user, ready, signIn } = useAuth();
  const [state, setState] = useState<{ uid: string; saved: boolean } | null>(null);
  const saved = !!user && state?.uid === user.id && state.saved;
  const setSaved = (value: boolean) => user && setState({ uid: user.id, saved: value });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("favorites")
      .select("product_id")
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data }) => live && setState({ uid, saved: !!data }));
    return () => {
      live = false;
    };
  }, [uid, productId]);

  const toggle = async () => {
    if (!user) {
      signIn(`Sign in to save ${productName} to your list.`);
      return;
    }
    const next = !saved;
    setBusy(true);
    setFailed(false);
    setSaved(next); // optimistic
    const sb = supabase();
    const { error } = next
      ? await sb.from("favorites").upsert({ user_id: user.id, product_id: productId }, { onConflict: "user_id,product_id" })
      : await sb.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId);
    if (error) {
      setSaved(!next);
      setFailed(true);
    } else if (next) {
      window.gtag?.("event", "favorite_add", { product_id: productId });
    }
    setBusy(false);
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !ready}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          saved ? "border-matcha bg-matcha-soft text-forest" : "border-line-strong bg-paper-raised text-ink hover:bg-matcha-soft"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" />
        </svg>
        {saved ? "Saved" : "Save"}
      </button>
      {failed && <span className="ml-3 text-xs text-red-700">Couldn&apos;t update your list. Try again.</span>}
    </div>
  );
}
