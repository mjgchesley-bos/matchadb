import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import Link from "@/i18n/Link";
import { getStats } from "@/lib/db";
import { getT } from "@/i18n/server";
import { fmtNum, isLocale, type Locale } from "@/i18n/config";
import { pageAlternates } from "@/i18n/seo";
import { rich } from "@/i18n/rich";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("about.meta.title"), description: t("about.meta.description"), alternates: pageAlternates(lang, "/about") };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  const t = getT(lang);
  const { brandCount, productCount } = await getStats();
  return (
    <LegalPage lang={lang} eyebrow={t("about.eyebrow")} title={t("about.title")}>
      <p>{t("about.p1", { products: fmtNum(lang, productCount), brands: fmtNum(lang, brandCount) })}</p>

      <h2>{t("about.h.data")}</h2>
      <p>{t("about.p.data")}</p>

      <h2>{t("about.h.dont")}</h2>
      <ul>
        <li>{t("about.dont.1")}</li>
        <li>{t("about.dont.2")}</li>
        <li>{t("about.dont.3")}</li>
        <li>{t("about.dont.4")}</li>
      </ul>

      <h2>{t("about.h.order")}</h2>
      <p>{t("about.p.order")}</p>

      <h2>{t("about.h.comp")}</h2>
      <p>{t("about.p.comp")}</p>

      <h2>{t("about.h.indep")}</h2>
      <p>{rich(t("about.p.indep", { privacy: "{privacy}" }), { privacy: <Link href="/privacy">{t("about.privacy")}</Link> })}</p>

      <p>{rich(t("about.p.tell", { tell: "{tell}" }), { tell: <Link href="/contact">{t("about.tell")}</Link> })}</p>
    </LegalPage>
  );
}
