import type { Metadata } from "next";
import { DemoWholesaleClient } from "@/components/DemoWholesaleClient";
import { langOf } from "@/i18n/params";

export const metadata: Metadata = { title: "Demo wholesale account", robots: { index: false, follow: false } };

export default async function DemoWholesalePage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  return <DemoWholesaleClient />;
}
