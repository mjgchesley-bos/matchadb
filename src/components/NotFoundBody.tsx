"use client";

import Link from "@/i18n/Link";
import { useT } from "@/i18n/client";

export function NotFoundBody() {
  const t = useT();
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-4">404</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mb-3">{t("c.nf.h1")}</h1>
        <p className="text-ink-muted mb-8">{t("c.nf.p")}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/browse"
            className="inline-flex items-center rounded-full bg-matcha text-paper px-6 py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            {t("c.nf.search")}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-line-strong text-ink px-6 py-2.5 text-sm font-medium tracking-wide transition-all hover:-translate-y-0.5 hover:border-matcha"
          >
            {t("c.nf.home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
