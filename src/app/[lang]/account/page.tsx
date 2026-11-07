import type { Metadata } from "next";
import { AccountClient } from "@/components/AccountClient";
import { langOf } from "@/i18n/params";

export const metadata: Metadata = {
  title: "My matcha",
  description: "Your saved products, ratings and reviews.",
  robots: { index: false, follow: false },
};

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  return <AccountClient />;
}
