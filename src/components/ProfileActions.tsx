"use client";

import Link from "@/i18n/Link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

// On a public profile: "Edit profile" for its owner, "Report" for everyone else who is signed in.
export function ProfileActions({ name }: { name: string }) {
  const { user, displayName, signIn } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const own = !!user && displayName?.toLowerCase() === name.toLowerCase();

  if (own) {
    return (
      <Link href="/account" className="inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:bg-matcha-soft">
        {t("c.pa.edit")}
      </Link>
    );
  }

  const report = async (reason: string) => {
    if (!user) return;
    const { error } = await supabase().from("profile_reports").insert({ reporter_id: user.id, profile_name: name, reason });
    if (!error || error.code === "23505") {
      setDone(true);
      setOpen(false);
    }
  };

  if (done) return <span className="text-xs text-ink-faint">{t("c.cm.reported")}</span>;
  if (open) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-xs text-ink-faint">
        {t("c.cm.why")}
        {(
          [
            ["Spam or ad", "c.cm.reason.spam"],
            ["Offensive", "c.cm.reason.offensive"],
            ["Impersonation", "c.pa.reason.imp"],
            ["Other", "c.cm.reason.other"],
          ] as const
        ).map(([r, key]) => (
          <button key={r} type="button" onClick={() => void report(r)} className="rounded-full border border-line-strong px-2.5 py-0.5 hover:bg-matcha-soft">
            {t(key)}
          </button>
        ))}
        <button type="button" onClick={() => setOpen(false)} className="underline">
          {t("c.cm.cancel")}
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => (user ? setOpen(true) : signIn(t("c.pa.signIn")))} className="text-xs text-ink-faint underline hover:text-ink-muted">
      {t("c.pa.report")}
    </button>
  );
}
