import { getT } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

export function LegalPage({
  eyebrow,
  title,
  updated,
  lang = "en",
  englishOnly = false,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  lang?: Locale;
  // Shows a notice that this page is only available in English (legal text is not machine-translated).
  englishOnly?: boolean;
  children: React.ReactNode;
}) {
  const t = getT(lang);
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
      <p className="font-mono text-xs tracking-[0.2em] uppercase text-forest mb-2">{eyebrow}</p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">{title}</h1>
      {updated && <p className="text-sm text-ink-faint mt-2">{t("legal.updated", { date: updated })}</p>}
      {englishOnly && lang !== "en" && (
        <p lang="en" className="mt-4 rounded-sm border border-line bg-paper-raised px-4 py-3 text-sm text-ink-muted">
          {getT("en")("page.englishOnly")}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-4 text-ink-muted leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-6 [&_a]:text-matcha [&_a:hover]:text-forest [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </main>
  );
}
