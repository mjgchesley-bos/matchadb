"use client";

import Link from "@/i18n/Link";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/i18n/client";

// "Message" on someone else's profile page: opens the conversation; signed-out visitors are asked to sign in first.
export function MessageLink({ name }: { name: string }) {
  const t = useT();
  const { user, displayName, signIn } = useAuth();
  if (user && displayName && displayName.toLowerCase() === name.toLowerCase()) return null;
  const cls = "inline-flex items-center rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-matcha hover:bg-matcha-soft";
  if (!user) return <button type="button" onClick={() => signIn(t("c.msg.signin"))} className={cls}>{t("c.msg.btn")}</button>;
  return <Link href={`/messages?with=${encodeURIComponent(name)}`} className={cls}>{t("c.msg.btn")}</Link>;
}
