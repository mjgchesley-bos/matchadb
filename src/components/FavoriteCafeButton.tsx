"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SaveCount } from "@/components/SaveCount";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

// Heart button on a café page: save it to My matcha (and to your public profile, if you have one).
export function FavoriteCafeButton({ cafeId, name }: { cafeId: string; name: string }) {
  const { user, ready, signIn } = useAuth();
  const t = useT();
  const [state, setState] = useState<{ uid: string; saved: boolean } | null>(null);
  const saved = !!user && state?.uid === user.id && state.saved;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [bump, setBump] = useState(0);
  const uid = user?.id ?? null;

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("favorite_cafes")
      .select("cafe_id")
      .eq("cafe_id", cafeId)
      .maybeSingle()
      .then(({ data }) => live && setState({ uid, saved: !!data }));
    return () => {
      live = false;
    };
  }, [uid, cafeId]);

  const toggle = async () => {
    if (!user) {
      signIn(t("c.fav.cafe.signIn", { name }));
      return;
    }
    const next = !saved;
    setBusy(true);
    setFailed(false);
    setState({ uid: user.id, saved: next });
    const sb = supabase();
    const { error } = next
      ? await sb.from("favorite_cafes").upsert({ user_id: user.id, cafe_id: cafeId }, { onConflict: "user_id,cafe_id" })
      : await sb.from("favorite_cafes").delete().eq("user_id", user.id).eq("cafe_id", cafeId);
    if (error) {
      setState({ uid: user.id, saved: !next });
      setFailed(true);
    } else {
      if (next) window.gtag?.("event", "favorite_cafe_add", { cafe_id: cafeId });
      setBump((b) => b + 1);
    }
    setBusy(false);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
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
        {saved ? t("c.fav.cafe.saved") : t("c.fav.cafe.save")}
      </button>
      <SaveCount kind="cafe" itemKey={cafeId} refresh={bump} />
      {failed && <span className="text-xs text-red-700">{t("c.fav.failed")}</span>}
    </div>
  );
}
