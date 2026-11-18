import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesClient } from "@/components/MessagesClient";
import { langOf } from "@/i18n/params";
import { getT } from "@/i18n/server";

// Private inbox: signed-in members only, never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MessagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getT(lang);
  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{t("msg.h1")}</h1>
      <Suspense>
        <MessagesClient />
      </Suspense>
    </main>
  );
}
