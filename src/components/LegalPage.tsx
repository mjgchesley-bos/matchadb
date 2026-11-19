import { getT } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { PageHero } from "@/components/PageUI";

// About, Contact, Terms and Privacy: a hero panel with the title, then the text in one bordered panel with outlined section headings.
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
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
      <PageHero eyebrow={eyebrow} title={title} lede={updated ? t("legal.updated", { date: updated }) : undefined} />
      {englishOnly && lang !== "en" && (
        <p lang="en" className="mt-4 rounded-sm border-2 border-line bg-paper-raised px-4 py-3 text-sm text-ink-muted">
          {getT("en")("page.englishOnly")}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-4 rounded-md border-2 border-line bg-paper-raised p-6 leading-relaxed text-ink-muted shadow-sm sm:p-8 [&_h2]:mt-6 [&_h2]:border-b-2 [&_h2]:border-line [&_h2]:pb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink first:[&_h2]:mt-0 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_a]:text-matcha [&_a:hover]:text-forest [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1.5 [&_strong]:text-ink">
        {children}
      </div>
    </main>
  );
}
