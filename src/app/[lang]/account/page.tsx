import type { Metadata } from "next";
import { AccountClient } from "@/components/AccountClient";
import { langOf } from "@/i18n/params";
import { isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = getT(lang);
  return { title: t("c.acct.title"), description: t("c.acct.desc"), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  return <AccountClient />;
}
