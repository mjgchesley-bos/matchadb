import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";
import { getT } from "@/i18n/server";
import { isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("contact.meta.title"), description: t("contact.meta.description"), alternates: pageAlternates(lang, "/contact") };
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const t = getT(lang);
  return (
    <LegalPage lang={lang} eyebrow={t("contact.eyebrow")} title={t("contact.title")}>
      <p>{t("contact.p1")}</p>
      {CONTACT_EMAIL ? (
        <p>{rich(t("contact.email", { email: "{email}" }), { email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> })}</p>
      ) : (
        <p>{t("contact.soon")}</p>
      )}
      <p>{t("contact.brands")}</p>
    </LegalPage>
  );
}
