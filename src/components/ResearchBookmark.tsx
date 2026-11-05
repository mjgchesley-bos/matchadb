"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

// Save a study to your research folder, with a private note only you can see.
export function ResearchBookmark({ studyId }: { studyId: number }) {
  const { user, ready, signIn, refreshStats } = useAuth();
  const uid = user?.id ?? null;
  const [state, setState] = useState<{ uid: string; saved: boolean; note: string } | null>(null);
  const saved = !!uid && state?.uid === uid && state.saved;
  const [draft, setDraft] = useState<string | null>(null);
  const note = draft ?? (uid && state?.uid === uid ? state.note : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase()
      .from("research_bookmarks")
      .select("note")
      .eq("study_id", studyId)
      .maybeSingle()
      .then(({ data }) => live && setState({ uid, saved: !!data, note: data?.note ?? "" }));
    return () => {
      live = false;
    };
  }, [uid, studyId]);

  const toggle = async () => {
    if (!user) {
      signIn("Sign in to save studies to your research folder.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const sb = supabase();
    if (saved) {
      const { error } = await sb.from("research_bookmarks").delete().eq("user_id", user.id).eq("study_id", studyId);
      if (!error) {
        setState({ uid: user.id, saved: false, note: "" });
        setDraft(null);
        void refreshStats();
      }
    } else {
      const { error } = await sb.from("research_bookmarks").upsert({ user_id: user.id, study_id: studyId }, { onConflict: "user_id,study_id" });
      if (!error) {
        setState({ uid: user.id, saved: true, note: "" });
        window.gtag?.("event", "research_save", { study_id: studyId });
        void refreshStats();
      }
    }
    setBusy(false);
  };

  const saveNote = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase()
      .from("research_bookmarks")
      .update({ note: note.slice(0, 1000), updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("study_id", studyId);
    setBusy(false);
    if (error) return setMessage("Couldn't save your note.");
    setState({ uid: user.id, saved: true, note });
    setDraft(null);
    setMessage("Note saved. Only you can see it.");
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !ready}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          saved ? "border-matcha bg-matcha-soft text-forest" : "border-line-strong bg-paper-raised text-ink hover:bg-matcha-soft"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M6 3h12v18l-6-4-6 4V3z" />
        </svg>
        {saved ? "In your research folder" : "Save to my research folder"}
      </button>
      {saved && (
        <div className="mt-3 max-w-xl">
          <label htmlFor="research-note" className="block text-sm font-medium text-ink">
            Private note
          </label>
          <textarea
            id="research-note"
            value={note}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, 1000));
              setMessage(null);
            }}
            rows={3}
            placeholder="Why this matters, what to follow up on…"
            className="mt-1.5 w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-matcha"
          />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={saveNote} disabled={busy || draft === null} className="rounded-full bg-matcha px-4 py-1.5 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
              Save note
            </button>
            {message && (
              <span className="text-xs text-ink-faint" aria-live="polite">
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
